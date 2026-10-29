/**
 * v-lazy 指令：懒加载图片
 * 直接双击打开 HTML（没有用 Vite/Webpack 等构建工具），我们需要稍微注意一下：不要用 export 语法。因为在浏览器直接打开的 HTML 里，如果直接写 <script src="v-lazy.js"></script>，它不认识 export 关键字，会报错。
最简单的方法是：在 v-lazy.js 里直接定义全局变量或常量，HTML 引入后直接使用即可
 */

// 默认占位图（Base64）
const DEFAULT_LOADING = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-size="14" text-anchor="middle" fill="%23999"%3E加载中...%3C/text%3E%3C/svg%3E';
const DEFAULT_ERROR = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100%25" height="100%25" fill="%23ffe6e6"/%3E%3Ctext x="50%25" y="50%25" font-size="14" text-anchor="middle" fill="%23ff0000"%3E加载失败%3C/text%3E%3C/svg%3E';

// 全局单例 Observer（核心优化：不管页面上有多少图片，只创建一个观察器）
let observer = null;
const vLazy = {
  // 当元素绑定到DOM时，触发
  mounted(el, binding) {

    // 1. 处理参数：允许传字符串 v-lazy="url"，也允许传对象 v-lazy="{ src: 'url', loading: 'xxx' }"，最后包装成统一的对象
    const options = typeof binding.value === 'string' 
      ? { src: binding.value } 
      : binding.value;

    const loadingImg = options.loading || DEFAULT_LOADING;
    const errorImg = options.error || DEFAULT_ERROR;

    // 2. 初始化：先显示占位图，把真实地址暂存到 dataset 里
    el.dataset.src = options.src;

    el.src = loadingImg;
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0.5'; // 初始半透明

    // 3. 监听图片的加载成功与失败事件
    const handleLoad = () => {
      el.style.opacity = '1'; // 加载成功，不透明
      // 清理监听器，防止内存泄漏
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
    
    const handleError = () => {
      el.src = errorImg; // 加载失败，显示兜底图
      el.style.opacity = '1';
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
    
    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);


    // 4. Fallback 降级：如果是极老的浏览器不支持 IntersectionObserver，直接加载原图
    if(!('IntersectionObserver' in window)) {
       el.src = options.src;
       return;
    }

     // 创建单例观察器
     if(!observer) {
       observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            const img = entry.target;
            const realSrc = img.dataset.src; // 真正的 URL 不放在闭包里，而是存在 DOM 元素的属性上（dataset），这样可以避免闭包过大，节省内存
            if (realSrc) {
              img.src = realSrc;
              delete img.dataset.src;
            }
            observer.unobserve(img);
          }
        })
       },
       // rootMargin 优化：rootMargin: '0px 0px 200px 0px'，让图片在距离视口还有 200px 的时候就开始加载。这样用户滑到底部时，图片已经提前加载好了，体感是“秒出”
       {
        rootMargin: '0px 0px 200px 0px',threshold: 0.01
       } );
     }
     observer.observe(el)
  },
  unmounted(el) {
    if(observer) {
      observer.unobserve(el);
    }
  }
};