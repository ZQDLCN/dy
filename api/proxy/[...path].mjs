// 配置常量
const MAX_RECURSION = 3;
const CACHE_TTL = 3600; // 缓存有效期1小时
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

// 工具函数：生成随机User-Agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 工具函数：日志调试
function logDebug(message) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[Proxy Debug] ${message}`);
    }
}

// 工具函数：获取URL的基础路径
function getBaseUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}`;
    } catch (e) {
        return url.substring(0, url.lastIndexOf('/') + 1);
    }
}

// 工具函数：解析相对URL为绝对URL
function resolveUrl(baseUrl, relativeUrl) {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
    }
    if (baseUrl.endsWith('/') && relativeUrl.startsWith('/')) {
        return baseUrl + relativeUrl.substring(1);
    }
    return baseUrl + relativeUrl;
}

// 工具函数：判断是否为M3U8内容
function isM3u8Content(content, contentType) {
    const textContent = typeof content === 'string' ? content : '';
    return (contentType && contentType.includes('application/x-mpegURL')) || 
           (contentType && contentType.includes('audio/mpegURL')) ||
           textContent.startsWith('#EXTM3U');
}

// 处理媒体播放列表（M3U8）
async function processMediaPlaylist(url, content) {
    const baseUrl = getBaseUrl(url);
    const lines = content.split('\n');
    const processedLines = [];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) {
            processedLines.push(line);
        } else if (line.endsWith('.ts') || line.endsWith('.m3u8') || line.includes('.ts?') || line.includes('.m3u8?')) {
            const absoluteUrl = resolveUrl(baseUrl, line);
            processedLines.push(absoluteUrl);
        } else {
            processedLines.push(line);
        }
    }

    return processedLines.join('\n');
}

// 处理M3U8内容（主入口）
async function processM3u8Content(url, content, recursionDepth, env) {
    if (recursionDepth > MAX_RECURSION) {
        throw new Error(`递归层数超过限制 (${MAX_RECURSION}): ${url}`);
    }

    if (content.includes('#EXT-X-STREAM-INF')) {
        return await processMasterPlaylist(url, content, recursionDepth, env);
    } else {
        return processMediaPlaylist(url, content);
    }
}

// 处理主M3U8播放列表（选择最高带宽）
async function processMasterPlaylist(url, content, recursionDepth, env) {
    if (recursionDepth > MAX_RECURSION) {
        throw new Error(`处理主列表时递归层数过多 (${MAX_RECURSION}): ${url}`);
    }

    const baseUrl = getBaseUrl(url);
    const lines = content.split('\n');
    let highestBandwidth = -1;
    let bestVariantUrl = '';

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
            const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
            const currentBandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;

            let variantUriLine = '';
            for (let j = i + 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line && !line.startsWith('#')) {
                    variantUriLine = line;
                    i = j;
                    break;
                }
            }

            if (variantUriLine && currentBandwidth >= highestBandwidth) {
                highestBandwidth = currentBandwidth;
                bestVariantUrl = resolveUrl(baseUrl, variantUriLine);
            }
        }
    }

    if (!bestVariantUrl) {
        logDebug(`主列表中未找到 BANDWIDTH 或 STREAM-INF，尝试查找第一个子列表引用: ${url}`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('#') && (line.endsWith('.m3u8') || line.includes('.m3u8?'))) {
                bestVariantUrl = resolveUrl(baseUrl, line);
                logDebug(`备选方案：找到第一个子列表引用: ${bestVariantUrl}`);
                break;
            }
        }
    }

    if (!bestVariantUrl) {
        logDebug(`在主列表 ${url} 中未找到任何有效的子播放列表 URL。将尝试按媒体列表处理原始内容。`);
        return processMediaPlaylist(url, content);
    }

    const cacheKey = `m3u8_processed:${bestVariantUrl}`;
    let kvNamespace = null;

    try {
        kvNamespace = env.LIBRETV_PROXY_KV;
        if (!kvNamespace) throw new Error("KV 命名空间未绑定");
    } catch (e) {
        logDebug(`KV 命名空间 'LIBRETV_PROXY_KV' 访问出错: ${e.message}`);
        kvNamespace = null;
    }

    if (kvNamespace) {
        try {
            const cachedContent = await kvNamespace.get(cacheKey);
            if (cachedContent) {
                logDebug(`[缓存命中] 主列表的子列表: ${bestVariantUrl}`);
                return cachedContent;
            }
        } catch (kvError) {
            logDebug(`从 KV 读取缓存失败 (${cacheKey}): ${kvError.message}`);
        }
    }

    logDebug(`选择的子列表 (带宽: ${highestBandwidth}): ${bestVariantUrl}`);
    const { content: variantContent, contentType: variantContentType } = await fetchContentWithType(bestVariantUrl);

    if (!isM3u8Content(variantContent, variantContentType)) {
        logDebug(`获取到的子列表 ${bestVariantUrl} 不是 M3U8 内容 (类型: ${variantContentType})。返回原始内容。`);
        return processMediaPlaylist(bestVariantUrl, variantContent);
    }

    const processedVariant = await processM3u8Content(bestVariantUrl, variantContent, recursionDepth + 1, env);

    if (kvNamespace) {
        try {
            waitUntil(kvNamespace.put(cacheKey, processedVariant, { expirationTtl: CACHE_TTL }));
            logDebug(`已将处理后的子列表写入缓存: ${bestVariantUrl}`);
        } catch (kvError) {
            logDebug(`向 KV 写入缓存失败 (${cacheKey}): ${kvError.message}`);
        }
    }

    return processedVariant;
}

// 核心修复：获取远程内容（支持二进制/文本）
async function fetchContentWithType(targetUrl) {
    const headers = new Headers({
        'User-Agent': getRandomUserAgent(),
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': new URL(targetUrl).origin + '/', // 规避防盗链
        'Origin': new URL(targetUrl).origin // 解决跨域校验
    });

    try {
        logDebug(`开始请求: ${targetUrl}`);
        const response = await fetch(targetUrl, { headers, redirect: 'follow' });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            logDebug(`请求失败: ${response.status} ${response.statusText} - ${targetUrl}`);
            throw new Error(`HTTP error ${response.status}: ${response.statusText}. URL: ${targetUrl}. Body: ${errorBody.substring(0, 150)}`);
        }

        const contentType = response.headers.get('Content-Type') || '';
        let content;

        // 区分二进制（图片/视频）和文本内容
        if (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('application/octet-stream')) {
            content = await response.arrayBuffer(); // 二进制用arrayBuffer
        } else {
            content = await response.text(); // 文本用text
        }
        
        logDebug(`请求成功: ${targetUrl}, Content-Type: ${contentType}, 长度: ${content.byteLength || content.length}`);
        return { content, contentType, responseHeaders: response.headers };

    } catch (error) {
        logDebug(`请求彻底失败: ${targetUrl}: ${error.message}`);
        throw new Error(`请求目标URL失败 ${targetUrl}: ${error.message}`);
    }
}

// 处理请求主逻辑
async function handleRequest(request, env) {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // 提取目标URL（从proxy后的参数）
        let targetUrl = decodeURIComponent(pathParts.slice(1).join('/'));
        if (!targetUrl) {
            targetUrl = url.searchParams.get('url') || '';
        }

        if (!targetUrl || !targetUrl.startsWith('http')) {
            return new Response('无效的目标URL', { status: 400 });
        }

        // 获取远程内容
        const { content, contentType, responseHeaders } = await fetchContentWithType(targetUrl);

        // 处理M3U8内容
        let finalContent = content;
        if (isM3u8Content(content, contentType)) {
            finalContent = await processM3u8Content(targetUrl, content, 0, env);
        }

        // 构建响应头（强制跨域）
        const headers = new Headers(responseHeaders);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        headers.set('Content-Type', contentType || 'application/octet-stream');

        // 区分二进制/文本响应
        if (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('application/octet-stream')) {
            return new Response(finalContent, { headers });
        } else {
            return new Response(finalContent, { headers });
        }

    } catch (error) {
        logDebug(`请求处理失败: ${error.message}`);
        return new Response(`代理请求失败: ${error.message}`, { status: 500 });
    }
}

// Cloudflare Worker 入口
export default {
    async fetch(request, env, ctx) {
        // 处理OPTIONS预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        ctx.waitUntil = (promise) => ctx.waitUntil(promise);
        return handleRequest(request, env);
    }
};
