/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

/**
 * 缓存函数，返回 innerHTML
 */
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template
    // 解析 template
    if (template) {
      if (typeof template === 'string') {
        // 模版是字符串且第一个字符为# 判断该字符串为 DOM 的 id
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
        
      } else if (template.nodeType) {
        // 判断 template 是 DOM 节点
        template = template.innerHTML
      } else {
        // templeate 不为 DOM || 没有#开头的字符串
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 无模版，获取 el 节点的 HTML给模板
      template = getOuterHTML(el)
    }

    // runtime-with-compiler 运行时进行 template 编译
    if (template) {
      /* istanbul ignore if */
      // 性能分析
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // 编译函数
      // 功能参考以下链接：
      // https://codesandbox.io/s/github/vuejs/vuejs.org/tree/master/src/v2/examples/vue-20-template-compilation?from-embed=&file=/index.html
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        // 默认 mustache template 风格 ['{{', '}}']: e.g. {{ msg }}
        // 如果设置为 delimiters: ['${', '}'] 就变成了 ES6 模板字符串的风格: e.g. ${ msg }
        delimiters: options.delimiters, 
        // 是否保留 HTML 注释
        comments: options.comments
      }, this)
      /** e.g.
        function anonymous() {
          with(this){return _c('div',[_m(0),(message)?_c('p',[_v(_s(message))]):_c('p',[_v("No message.")])])}
        }
       */
      options.render = render
      /** e.g.
       * 存储静态节点
        _m(0): function anonymous() {
          with(this){return _c('header',[_c('h1',[_v("I'm a template!")])])}
        }
       */
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
