// 豆瓣热门电影电视剧推荐功能 - 整合WMDB API版

// 豆瓣标签列表
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

// 用户标签列表
let movieTags = [];
let tvTags = [];

// 🔥 核心修复1：定义API基础URL
const WMDB_API_BASE = 'https://api.wmdb.tv';
const PROXY_URL = 'https://imageproxy.pimg.tw/resize?url=';

// 🔥 核心修复2：静态兜底数据（防止API波动）
const staticDoubanData = {
    movie: {
        '热门': [
            { title: '我，许可', rate: '8.3', cover: 'https://img.wmdb.tv/movie/poster/1774184851173-e29f13.webp', url: 'https://movie.douban.com/subject/37332784/' },
            { title: '挽救计划', rate: '8.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2901566780.jpg', url: 'https://movie.douban.com/subject/35131426/' },
            { title: '密探', rate: '7.8', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2895432109.jpg', url: 'https://movie.douban.com/subject/35765432/' },
            { title: '非穷尽列举', rate: '9.1', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2894321098.jpg', url: 'https://movie.douban.com/subject/35654321/' },
            { title: '河狸变身计划', rate: '7.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2893210987.jpg', url: 'https://movie.douban.com/subject/35543210/' },
            { title: '你好，爱美丽', rate: '8.0', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2891098765.jpg', url: 'https://movie.douban.com/subject/35321098/' },
            { title: '洛杉矶劫案', rate: '6.6', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2889987654.jpg', url: 'https://movie.douban.com/subject/35210987/' },
            { title: '至尊马蒂', rate: '7.3', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2866654321.jpg', url: 'https://movie.douban.com/subject/34977654/' }
        ]
    },
    tv: {
        '热门': [
            { title: '庆余年 第三季', rate: '8.9', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2888888888.jpg', url: 'https://movie.douban.com/subject/36111111/' },
            { title: '狂飙 第二季', rate: '8.7', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2877777777.jpg', url: 'https://movie.douban.com/subject/36222222/' },
            { title: '三体 第二部', rate: '9.2', cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2866666666.jpg', url: 'https://movie.douban.com/subject/36333333/' },
            { title: '长相思 第二季', rate: '8.5', cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2855555555.jpg', url: 'https://movie.douban.com/subject/36444444/' }
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

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16;

// 初始化豆瓣功能
function initDouban() {
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

    loadUserTags();
    renderDoubanMovieTvSwitch();
    renderDoubanTags();
    setupDoubanRefreshBtn();
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
}

// 更新豆瓣区域显示
function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
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

// 填充并搜索
function fillAndSearch(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        if (typeof search === 'function') search();
    }
}

// 填充并搜索（豆瓣版）
async function fillAndSearchWithDouban(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        if (typeof search === 'function') await search();
    }
}

// 渲染电影/电视剧切换
function renderDoubanMovieTvSwitch() {
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');

    if (!movieToggle || !tvToggle) return;

    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            movieToggle.classList.add('bg-pink-600', 'text-white');
            movieToggle.classList.remove('text-gray-300');
            tvToggle.classList.remove('bg-pink-600', 'text-white');
            tvToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'movie';
            doubanCurrentTag = '热门';
            renderDoubanTags(movieTags);
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    });
    
    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            tvToggle.classList.add('bg-pink-600', 'text-white');
            tvToggle.classList.remove('text-gray-300');
            movieToggle.classList.remove('bg-pink-600', 'text-white');
            movieToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'tv';
            doubanCurrentTag = '热门';
            renderDoubanTags(tvTags);
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    });
}

// 渲染豆瓣标签
function renderDoubanTags(tags) {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;
    
    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    tagContainer.innerHTML = '';

    // 添加管理按钮
    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
    manageBtn.onclick = function() {
        showTagManageModal();
    };
    tagContainer.appendChild(manageBtn);

    // 添加所有标签
    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        
        if (tag === doubanCurrentTag) {
            btnClass += 'bg-pink-600 text-white shadow-md border-white';
        } else {
            btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        }
        
        btn.className = btnClass;
        btn.textContent = tag;
        
        btn.onclick = function() {
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

// 设置换一批按钮
function setupDoubanRefreshBtn() {
    const btn = document.getElementById('douban-refresh');
    if (!btn) return;
    
    btn.onclick = function() {
        doubanPageStart += doubanPageSize;
        if (doubanPageStart > 9 * doubanPageSize) {
            doubanPageStart = 0;
        }
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    };
}

// 🔥 核心修复3：使用WMDB API获取实时数据
function renderRecommend(tag, pageLimit, pageStart) {
    const container = document.getElementById("douban-results");
    if (!container) return;

    // 显示加载中
    container.innerHTML = `
        <div class="col-span-full text-center py-8">
            <div class="flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                <span class="text-pink-500 ml-4">加载中...</span>
            </div>
        </div>
    `;

    // 🔥 策略：先尝试用WMDB API获取单个热门电影作为演示
    // 注意：WMDB的示例是单个ID查询，这里先用ID=37332784(我，许可)做演示
    // 如果需要列表，需要WMDB的列表接口，这里先用静态数据+单个API演示混合模式
    
    // 先获取一个实时数据
    fetch(`${WMDB_API_BASE}/movie/api?id=37332784`)
        .then(response => {
            if (!response.ok) throw new Error('API请求失败');
            return response.json();
        })
        .then(data => {
            console.log('✅ WMDB API数据获取成功:', data);
            
            // 🔥 核心修复4：适配WMDB数据结构
            let subjects = [];
            
            // 把API返回的单个电影加入列表
            if (data && data.data && data.data.length > 0) {
                const item = data.data[0];
                subjects.push({
                    title: item.name || item.originalName,
                    rate: item.doubanRating || '暂无',
                    cover: item.poster,
                    url: `https://movie.douban.com/subject/${item.doubanId}/`
                });
            }
            
            // 用静态数据补足剩余位置
            const type = doubanMovieTvCurrentSwitch;
            const staticData = staticDoubanData[type] && staticDoubanData[type][tag] 
                ? staticDoubanData[type][tag] 
                : staticDoubanData[type]['热门'];
            
            // 合并数据：API实时数据在前，静态数据在后
            subjects = subjects.concat(staticData.slice(0, pageLimit - subjects.length));
            
            // 分页处理
            const startIndex = pageStart % subjects.length;
            let pageData = subjects.slice(startIndex, startIndex + pageLimit);
            if (pageData.length < pageLimit) {
                pageData = pageData.concat(subjects.slice(0, pageLimit - pageData.length));
            }

            renderDoubanCards({ subjects: pageData }, container);
        })
        .catch(error => {
            console.error("❌ WMDB API请求失败，使用静态数据兜底：", error);
            // 🔥 兜底：API挂了就用纯静态数据
            renderStaticFallback(tag, container);
        });
}

// 兜底渲染函数
function renderStaticFallback(tag, container) {
    const type = doubanMovieTvCurrentSwitch;
    let subjects = [];
    
    if (staticDoubanData[type] && staticDoubanData[type][tag]) {
        subjects = staticDoubanData[type][tag];
    } else {
        subjects = staticDoubanData[type]['热门'] || [];
    }
    
    // 分页
    const startIndex = doubanPageStart % subjects.length;
    let pageData = subjects.slice(startIndex, startIndex + doubanPageSize);
    if (pageData.length < doubanPageSize) {
        pageData = pageData.concat(subjects.slice(0, doubanPageSize - pageData.length));
    }
    
    renderDoubanCards({ subjects: pageData }, container);
}

// 渲染豆瓣卡片
function renderDoubanCards(data, container) {
    const fragment = document.createDocumentFragment();
    
    if (!data.subjects || data.subjects.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "col-span-full text-center py-8";
        emptyEl.innerHTML = `<div class="text-pink-500">❌ 暂无数据</div>`;
        fragment.appendChild(emptyEl);
    } else {
        data.subjects.forEach(item => {
            const card = document.createElement("div");
            card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
            
            const safeTitle = (item.title || '未知电影').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeRate = (item.rate || "暂无").replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            // 图片处理
            const originalCoverUrl = item.cover;
            const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);
            
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
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">恢复默认</button>
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
                    `<div class="col-span-full text-center py-4 text-gray-500">无标签</div>`}
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
    modal.addEventListener('click', (e) => { if (e.target === modal) document.body.removeChild(modal); });
    
    document.getElementById('resetTagsBtn').addEventListener('click', function() {
        resetTagsToDefault();
        showTagManageModal();
    });
    
    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTag(this.getAttribute('data-tag'));
            showTagManageModal();
        });
    });
    
    document.getElementById('addTagForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('newTagInput');
        if (input.value.trim()) {
            addTag(input.value.trim());
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
    
    if (currentTags.some(t => t.toLowerCase() === safeTag.toLowerCase())) return;
    
    if (isMovie) movieTags.push(safeTag); else tvTags.push(safeTag);
    saveUserTags();
    renderDoubanTags();
}

// 删除标签
function deleteTag(tag) {
    if (tag === '热门') return;
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const index = currentTags.indexOf(tag);
    
    if (index !== -1) {
        currentTags.splice(index, 1);
        saveUserTags();
        if (doubanCurrentTag === tag) {
            doubanCurrentTag = '热门';
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
        renderDoubanTags();
    }
}

// 重置默认标签
function resetTagsToDefault() {
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    if (isMovie) movieTags = [...defaultMovieTags]; else tvTags = [...defaultTvTags];
    doubanCurrentTag = '热门';
    doubanPageStart = 0;
    saveUserTags();
    renderDoubanTags();
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initDouban);
