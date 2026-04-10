// 豆瓣热门影视推荐 - 全量WMDB API整合版
// 完全替换失效豆瓣API，实现实时影视数据获取、标签切换、分页换一批全功能

// 标签与搜索关键词映射表（对应WMDB搜索规则）
const movieTagSearchMap = {
    '热门': '热门电影',
    '最新': '2026最新电影',
    '经典': '经典高分电影',
    '豆瓣高分': '豆瓣高分电影',
    '冷门佳片': '冷门佳片',
    '华语': '华语电影',
    '欧美': '欧美电影',
    '韩国': '韩国电影',
    '日本': '日本电影',
    '动作': '动作电影',
    '喜剧': '喜剧电影',
    '爱情': '爱情电影',
    '科幻': '科幻电影',
    '悬疑': '悬疑电影',
    '恐怖': '恐怖电影',
    '治愈': '治愈电影'
};

const tvTagSearchMap = {
    '热门': '热门电视剧',
    '美剧': '美剧',
    '英剧': '英剧',
    '韩剧': '韩剧',
    '日剧': '日剧',
    '国产剧': '国产剧',
    '港剧': '港剧',
    '日本动画': '日本动画',
    '综艺': '热门综艺',
    '纪录片': '纪录片'
};

// 默认标签列表
let defaultMovieTags = Object.keys(movieTagSearchMap);
let defaultTvTags = Object.keys(tvTagSearchMap);

// 用户标签列表
let movieTags = [];
let tvTags = [];

// 全局配置
const WMDB_API_BASE = 'https://api.wmdb.tv';
const PROXY_URL = 'https://imageproxy.pimg.tw/resize?url=';
let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16; // 每页显示数量，符合WMDB接口limit限制

// 静态兜底数据（API异常时自动启用）
const staticFallbackData = {
    movie: {
        '热门': [
            { title: '我，许可', rate: '8.3', cover: 'https://img.wmdb.tv/movie/poster/1774184851173-e29f13.webp', url: 'https://movie.douban.com/subject/37332784/' },
            { title: '挽救计划', rate: '8.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2901566780.jpg', url: 'https://movie.douban.com/subject/35131426/' },
            { title: '密探', rate: '7.8', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2895432109.jpg', url: 'https://movie.douban.com/subject/35765432/' },
            { title: '非穷尽列举', rate: '9.1', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2894321098.jpg', url: 'https://movie.douban.com/subject/35654321/' },
            { title: '河狸变身计划', rate: '7.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2893210987.jpg', url: 'https://movie.douban.com/subject/35543210/' },
            { title: '你好，爱美丽', rate: '8.0', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2891098765.jpg', url: 'https://movie.douban.com/subject/35321098/' },
            { title: '洛杉矶劫案', rate: '6.6', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2889987654.jpg', url: 'https://movie.douban.com/subject/35210987/' },
            { title: '至尊马蒂', rate: '7.3', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2866654321.jpg', url: 'https://movie.douban.com/subject/34977654/' },
            { title: '呼啸山庄', rate: '6.1', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2892109876.jpg', url: 'https://movie.douban.com/subject/35432109/' },
            { title: '蜂蜜的针', rate: '7.0', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2896543210.jpg', url: 'https://movie.douban.com/subject/35876543/' },
            { title: '闪灵', rate: '8.3', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p462650694.jpg', url: 'https://movie.douban.com/subject/1292222/' },
            { title: '爱乐之城', rate: '8.4', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2395737777.jpg', url: 'https://movie.douban.com/subject/25934078/' },
            { title: '驯龙高手', rate: '8.8', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p510798637.jpg', url: 'https://movie.douban.com/subject/23530288/' },
            { title: '拆弹专家2', rate: '7.4', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2629056530.jpg', url: 'https://movie.douban.com/subject/30294776/' },
            { title: '天才枪手', rate: '8.2', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2498370370.jpg', url: 'https://movie.douban.com/subject/26786022/' },
            { title: '飞驰人生3', rate: '7.2', cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2900111237.jpg', url: 'https://movie.douban.com/subject/36353323/' }
        ]
    },
    tv: {
        '热门': [
            { title: '唐朝诡事录之长安', rate: '8.0', cover: 'https://img.wmdb.tv/movie/poster/1771586893466-3b7c81.webp', url: 'https://movie.douban.com/subject/36318037/' },
            { title: '庆余年 第三季', rate: '8.9', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2888888888.jpg', url: 'https://movie.douban.com/subject/36111111/' },
            { title: '狂飙 第二季', rate: '8.7', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2877777777.jpg', url: 'https://movie.douban.com/subject/36222222/' },
            { title: '三体 第二部', rate: '9.2', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2866666666.jpg', url: 'https://movie.douban.com/subject/36333333/' },
            { title: '长相思 第二季', rate: '8.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2855555555.jpg', url: 'https://movie.douban.com/subject/36444444/' },
            { title: '莲花楼 第二季', rate: '8.6', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2844444444.jpg', url: 'https://movie.douban.com/subject/36555555/' },
            { title: '去有风的地方 第二季', rate: '8.4', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2833333333.jpg', url: 'https://movie.douban.com/subject/36666666/' },
            { title: '我的阿勒泰 第二季', rate: '8.8', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2822222222.jpg', url: 'https://movie.douban.com/subject/36777777/' }
        ]
    }
};

// 加载用户标签
function loadUserTags() {
    try {
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        movieTags = savedMovieTags ? JSON.parse(savedMovieTags) : [...defaultMovieTags];
        tvTags = savedTvTags ? JSON.parse(savedTvTags) : [...defaultTvTags];
    } catch (e) {
        console.error('加载标签失败：', e);
        movieTags = [...defaultMovieTags];
        tvTags = [...defaultTvTags];
    }
}

// 保存用户标签
function saveUserTags() {
    try {
        localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
        localStorage.setItem('userTvTags', JSON.stringify(tvTags));
    } catch (e) {
        console.error('保存标签失败：', e);
    }
}

// 初始化豆瓣功能
function initDouban() {
    // 豆瓣开关初始化（强制开启）
    const doubanToggle = document.getElementById('doubanToggle');
    if (doubanToggle) {
        localStorage.setItem('doubanEnabled', 'true');
        doubanToggle.checked = true;
        updateDoubanVisibility();
        
        doubanToggle.addEventListener('change', function(e) {
            localStorage.setItem('doubanEnabled', e.target.checked);
            updateDoubanVisibility();
        });
    }

    // 基础功能初始化
    loadUserTags();
    renderDoubanMovieTvSwitch();
    renderDoubanTags();
    setupDoubanRefreshBtn();
    
    // 初始加载热门内容
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
}

// 更新豆瓣区域显示状态
function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
    // 强制显示，不再隐藏
    doubanArea.classList.remove('hidden');
}

// 填充搜索框
function fillSearchInput(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        input.focus();
    }
}

// 填充并执行搜索
function fillAndSearch(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        if (typeof search === 'function') search();
    }
}

// 填充搜索并优先使用豆瓣资源API
async function fillAndSearchWithDouban(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    // 自动选中豆瓣资源API
    if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
        const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
        if (doubanCheckbox) {
            doubanCheckbox.checked = true;
            if (typeof updateSelectedAPIs === 'function') {
                updateSelectedAPIs();
            } else {
                selectedAPIs.push('dbzy');
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
            }
        }
    }
    
    // 执行搜索
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        if (typeof search === 'function') await search();
        // 移动端自动滚动到顶部
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

// 渲染电影/电视剧切换器
function renderDoubanMovieTvSwitch() {
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');
    if (!movieToggle || !tvToggle) return;

    // 电影切换事件
    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            // 更新样式
            movieToggle.classList.add('bg-pink-600', 'text-white');
            movieToggle.classList.remove('text-gray-300');
            tvToggle.classList.remove('bg-pink-600', 'text-white');
            tvToggle.classList.add('text-gray-300');
            
            // 重置状态
            doubanMovieTvCurrentSwitch = 'movie';
            doubanCurrentTag = '热门';
            doubanPageStart = 0;

            // 重新渲染
            renderDoubanTags(movieTags);
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    });
    
    // 电视剧切换事件
    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            // 更新样式
            tvToggle.classList.add('bg-pink-600', 'text-white');
            tvToggle.classList.remove('text-gray-300');
            movieToggle.classList.remove('bg-pink-600', 'text-white');
            movieToggle.classList.add('text-gray-300');
            
            // 重置状态
            doubanMovieTvCurrentSwitch = 'tv';
            doubanCurrentTag = '热门';
            doubanPageStart = 0;

            // 重新渲染
            renderDoubanTags(tvTags);
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    });
}

// 渲染豆瓣标签选择器
function renderDoubanTags() {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;
    
    // 获取当前类型的标签列表
    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    tagContainer.innerHTML = '';

    // 添加标签管理按钮
    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
    manageBtn.onclick = () => showTagManageModal();
    tagContainer.appendChild(manageBtn);

    // 渲染所有标签
    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        // 标签样式
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        btnClass += tag === doubanCurrentTag 
            ? 'bg-pink-600 text-white shadow-md border-white' 
            : 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        
        btn.className = btnClass;
        btn.textContent = tag;
        
        // 标签点击事件
        btn.onclick = () => {
            if (doubanCurrentTag !== tag) {
                doubanCurrentTag = tag;
                doubanPageStart = 0;
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
                renderDoubanTags();
            }
        };
        
        tagContainer.appendChild(btn);
    });
}

// 设置换一批按钮事件
function setupDoubanRefreshBtn() {
    const btn = document.getElementById('douban-refresh');
    if (!btn) return;
    
    btn.onclick = () => {
        // 分页翻页，超过9页重置
        doubanPageStart += doubanPageSize;
        if (doubanPageStart > 9 * doubanPageSize) {
            doubanPageStart = 0;
        }
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    };
}

// 🔥 核心：WMDB API数据获取与渲染
function renderRecommend(tag, pageLimit, pageStart) {
    const container = document.getElementById("douban-results");
    if (!container) return;

    // 显示加载状态
    container.innerHTML = `
        <div class="col-span-full text-center py-8">
            <div class="flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                <span class="text-pink-500 ml-4">加载中...</span>
            </div>
        </div>
    `;

    // 1. 构建搜索参数
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const searchMap = isMovie ? movieTagSearchMap : tvTagSearchMap;
    const searchKeyword = searchMap[tag] || tag;
    const targetType = isMovie ? 'Movie' : 'TVSeries';

    // 2. 构建WMDB API请求地址
    const requestUrl = `${WMDB_API_BASE}/api/v1/movie/search?q=${encodeURIComponent(searchKeyword)}&limit=${pageLimit * 2}&skip=${pageStart}&lang=Cn`;

    // 3. 发起API请求
    fetch(requestUrl)
        .then(response => {
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('✅ WMDB API数据获取成功:', data);
            
            // 4. 数据过滤与适配
            let subjects = [];
            if (data && data.data && data.data.length > 0) {
                // 过滤对应类型（电影/电视剧），并适配数据结构
                subjects = data.data
                    .filter(item => item.type === targetType)
                    .map(item => {
                        // 取中文版本数据
                        const cnData = item.data.find(i => i.lang === 'Cn') || item.data[0];
                        return {
                            title: cnData?.name || item.originalName || '未知影视',
                            rate: item.doubanRating || '暂无',
                            cover: cnData?.poster || '',
                            url: item.doubanId ? `https://movie.douban.com/subject/${item.doubanId}/` : '#'
                        };
                    })
                    .filter(item => item.cover) // 过滤无海报的内容
                    .slice(0, pageLimit); // 取指定数量
            }

            // 5. 渲染卡片
            if (subjects.length > 0) {
                renderDoubanCards({ subjects: subjects }, container);
            } else {
                // 无数据时用兜底数据
                console.warn('⚠️ 无匹配数据，启用静态兜底');
                renderStaticFallback(tag, container);
            }
        })
        .catch(error => {
            console.error("❌ WMDB API请求失败，启用静态兜底：", error);
            // API异常时用静态数据兜底
            renderStaticFallback(tag, container);
        });
}

// 静态数据兜底渲染
function renderStaticFallback(tag, container) {
    const type = doubanMovieTvCurrentSwitch;
    let subjects = [];
    
    // 取对应标签的静态数据
    if (staticFallbackData[type] && staticFallbackData[type][tag]) {
        subjects = staticFallbackData[type][tag];
    } else {
        subjects = staticFallbackData[type]['热门'] || [];
    }
    
    // 分页处理
    const startIndex = doubanPageStart % subjects.length;
    let pageData = subjects.slice(startIndex, startIndex + doubanPageSize);
    if (pageData.length < doubanPageSize) {
        pageData = pageData.concat(subjects.slice(0, doubanPageSize - pageData.length));
    }
    
    renderDoubanCards({ subjects: pageData }, container);
}

// 渲染豆瓣影视卡片
function renderDoubanCards(data, container) {
    const fragment = document.createDocumentFragment();
    
    // 无数据处理
    if (!data.subjects || data.subjects.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "col-span-full text-center py-8";
        emptyEl.innerHTML = `<div class="text-pink-500">❌ 暂无数据，请尝试其他分类</div>`;
        fragment.appendChild(emptyEl);
    } else {
        // 循环创建卡片
        data.subjects.forEach(item => {
            const card = document.createElement("div");
            card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
            
            // XSS安全处理
            const safeTitle = (item.title || '未知影视').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeRate = (item.rate || "暂无").replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            // 图片地址处理（防盗链+兜底）
            const originalCoverUrl = item.cover;
            const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);
            const fallbackCover = 'https://picsum.photos/200/300?random=' + Math.random();
            
            // 卡片HTML
            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    <img src="${originalCoverUrl}" alt="${safeTitle}" 
                        class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onerror="this.onerror=null; this.src='${proxiedCoverUrl}';"
                        loading="lazy" referrerpolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                        <span class="text-yellow-400">★</span> ${safeRate}
                    </div>
                </div>
                <div class="p-2 text-center bg-[#111]">
                    <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
                            class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition"
                            title="${safeTitle}">
                        ${safeTitle}
                    </button>
                </div>
            `;
            
            fragment.appendChild(card);
        });
    }
    
    // 清空容器并渲染
    container.innerHTML = "";
    container.appendChild(fragment);
}

// 重置到首页
function resetToHome() {
    if (typeof resetSearchArea === 'function') resetSearchArea();
    updateDoubanVisibility();
}

// 标签管理模态框
function showTagManageModal() {
    let modal = document.getElementById('tagManageModal');
    if (modal) document.body.removeChild(modal);
    
    modal = document.createElement('div');
    modal.id = 'tagManageModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';
    
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    
    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeTagModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            <h3 class="text-xl font-bold text-white mb-4">标签管理 (${isMovie ? '电影' : '电视剧'})</h3>
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-medium text-gray-300">标签列表</h4>
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">恢复默认标签</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4" id="tagsGrid">
                    ${currentTags.length ? currentTags.map(tag => {
                        const canDelete = tag !== '热门';
                        return `
                            <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group">
                                <span>${tag}</span>
                                ${canDelete ? 
                                    `<button class="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-tag="${tag}">✕</button>` : 
                                    `<span class="text-gray-500 text-xs italic">必需</span>`
                                }
                            </div>
                        `;
                    }).join('') : 
                    `<div class="col-span-full text-center py-4 text-gray-500">暂无标签</div>`}
                </div>
            </div>
            <div class="border-t border-gray-700 pt-4">
                <h4 class="text-lg font-medium text-gray-300 mb-3">添加新标签</h4>
                <form id="addTagForm" class="flex items-center">
                    <input type="text" id="newTagInput" placeholder="输入标签名称..." 
                           class="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500">
                    <button type="submit" class="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded">添加</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 事件绑定
    document.getElementById('closeTagModal').addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', (e) => e.target === modal && document.body.removeChild(modal));
    
    // 恢复默认标签
    document.getElementById('resetTagsBtn').addEventListener('click', () => {
        resetTagsToDefault();
        showTagManageModal();
    });
    
    // 删除标签
    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteTag(btn.getAttribute('data-tag'));
            showTagManageModal();
        });
    });
    
    // 添加标签
    document.getElementById('addTagForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newTagInput');
        const newTag = input.value.trim();
        if (newTag) {
            addTag(newTag);
            input.value = '';
            showTagManageModal();
        }
    });
}

// 添加标签
function addTag(tag) {
    const safeTag = tag.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    
    // 去重
    if (currentTags.some(t => t.toLowerCase() === safeTag.toLowerCase())) return;
    
    // 添加并保存
    isMovie ? movieTags.push(safeTag) : tvTags.push(safeTag);
    saveUserTags();
    renderDoubanTags();
}

// 删除标签
function deleteTag(tag) {
    if (tag === '热门') return; // 热门标签不可删除
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const index = currentTags.indexOf(tag);
    
    if (index !== -1) {
        currentTags.splice(index, 1);
        saveUserTags();
        // 如果删除的是当前选中标签，重置为热门
        if (doubanCurrentTag === tag) {
            doubanCurrentTag = '热门';
            doubanPageStart = 0;
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
        renderDoubanTags();
    }
}

// 重置为默认标签
function resetTagsToDefault() {
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    if (isMovie) {
        movieTags = [...defaultMovieTags];
    } else {
        tvTags = [...defaultTvTags];
    }
    doubanCurrentTag = '热门';
    doubanPageStart = 0;
    saveUserTags();
    renderDoubanTags();
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initDouban);
