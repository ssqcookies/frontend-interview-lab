import type { Directive, DirectiveBinding } from 'vue'
/**写 `import type`：编译时这些导入会被擦除，最终 JS 文件里**完全没有这行代码**，不打包进浏览器； */



// 1. 默认占位图（Base64），防止网络请求
const DEFAULT_LOADING = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-size="12" text-anchor="middle" fill="%23999"%3ELoading...%3C/text%3E%3C/svg%3E'
const DEFAULT_ERROR = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100%25" height="100%25" fill="%23fee"/%3E%3Ctext x="50%25" y="50%25" font-size="12" text-anchor="middle" fill="%23f00"%3EError%3C/text%3E%3C/svg%3E'

/** 指令可选参数 */
export interface LazyOptions {
  /** 真实图片地址 */
  src: string
  /** 进入视口提前加载距离，如 '200px' */
  rootMargin?: string
  /** 加载中占位图 */
  loading?: string
  /** 加载失败兜底图 */
  error?: string
}

// 全局唯一的 Observer 实例（性能优化：避免每个元素都创建一个实例）
let observer: IntersectionObserver | null = null

export const vLazy: Directive<HTMLImageElement, string | LazyOptions> = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string | LazyOptions>) {
    // 1. 解析指令参数（支持传字符串或对象）
    const options: LazyOptions = typeof binding.value === 'string'
      ? { src: binding.value }
      : binding.value

    const loadingImg = options.loading || DEFAULT_LOADING
    const errorImg = options.error || DEFAULT_ERROR

    // 2. 初始化图片状态
    el.src = loadingImg
    el.dataset.src = options.src
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0.5' // 加载中变暗


    // 3. 图片加载成功/失败的事件监听
    const handleLoad = () => {
      el.style.opacity = '1'
      el.removeEventListener('load', handleLoad)
      el.removeEventListener('error', handleError)
    }
    const handleError = () => {
      el.src = errorImg
      el.style.opacity = '1'
      el.removeEventListener('load', handleLoad)
      el.removeEventListener('error', handleError)
    }
    el.addEventListener('load', handleLoad)
    el.addEventListener('error', handleError)

    // 4. Fallback 降级处理
    if (!('IntersectionObserver' in window)) {
      el.src = options.src
      return
    }
    // 5. 初始化单例 IntersectionObserver
    if (!observer) {
      observer = new IntersectionObserver((entrise) => {
        entrise.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const realSrc = img.dataset.src
            if (realSrc) {
              img.src = realSrc // 触发 load 事件加载真实图片
              delete img.dataset.src // 清理 data-src
            }
            // 图片进入视口后，立刻停止观察，释放内存
            observer?.unobserve(img)
          }
        })
      }, {
        rootMargin: options.rootMargin || '0px 0px 200px 0px', // 提前加载距离
      })
    }
    observer.observe(el) // 开始观察当前图片

  },
  // 6. 组件卸载时的清理工作（防止内存泄漏）
  unmounted(el: HTMLImageElement) {
    if (observer) {
      observer.unobserve(el)
    }
  }


}