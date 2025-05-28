// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="cover.html">封面</a></li><li class="chapter-item expanded "><a href="author_interview.html">作者访谈录</a></li><li class="chapter-item expanded "><a href="preface_1.html">序言一</a></li><li class="chapter-item expanded "><a href="preface_2.html">序言二</a></li><li class="chapter-item expanded "><a href="preface_3.html">序言三</a></li><li class="chapter-item expanded "><a href="introduction.html">导读</a></li><li class="chapter-item expanded "><a href="contact.html">联系博文视点</a></li><li class="chapter-item expanded "><a href="part_1.html">第1部分 简介</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_1.html">第1章 温故而知新</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_1_1.html">1.1 从Hello World说起</a></li><li class="chapter-item expanded "><a href="chapter_1_2.html">1.2 万变不离其宗</a></li><li class="chapter-item expanded "><a href="chapter_1_3.html">1.3 站得高，望得远</a></li><li class="chapter-item expanded "><a href="chapter_1_4.html">1.4 操作系统做什么</a></li><li class="chapter-item expanded "><a href="chapter_1_5.html">1.5 内存不够怎么办</a></li><li class="chapter-item expanded "><a href="chapter_1_6.html">1.6 众人拾柴火焰高</a></li><li class="chapter-item expanded "><a href="chapter_1_7.html">1.7 本章小结</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="part_2.html">第2部分 静态链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_2.html">第2章 编译和链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_2_1.html">2.1 被隐藏了的过程</a></li><li class="chapter-item expanded "><a href="chapter_2_2.html">2.2 编译器做了什么</a></li><li class="chapter-item expanded "><a href="chapter_2_3.html">2.3 链接器年龄比编译器长</a></li><li class="chapter-item expanded "><a href="chapter_2_4.html">2.4 模块拼装——静态链接</a></li><li class="chapter-item expanded "><a href="chapter_2_5.html">2.5 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_3.html">第3章 目标文件里有什么</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_3_1.html">3.1 目标文件的格式</a></li><li class="chapter-item expanded "><a href="chapter_3_2.html">3.2 目标文件是什么样的</a></li><li class="chapter-item expanded "><a href="chapter_3_3.html">3.3 挖掘SimpleSection.o</a></li><li class="chapter-item expanded "><a href="chapter_3_4.html">3.4 ELF文件结构描述</a></li><li class="chapter-item expanded "><a href="chapter_3_5.html">3.5 链接的接口——符号</a></li><li class="chapter-item expanded "><a href="chapter_3_6.html">3.6 调试信息</a></li><li class="chapter-item expanded "><a href="chapter_3_7.html">3.7 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_4.html">第4章 静态链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_4_1.html">4.1 空间与地址分配</a></li><li class="chapter-item expanded "><a href="chapter_4_2.html">4.2 符号解析与重定位</a></li><li class="chapter-item expanded "><a href="chapter_4_3.html">4.3 COMMON块</a></li><li class="chapter-item expanded "><a href="chapter_4_4.html">4.4 C++相关问题</a></li><li class="chapter-item expanded "><a href="chapter_4_5.html">4.5 静态库链接</a></li><li class="chapter-item expanded "><a href="chapter_4_6.html">4.6 链接过程控制</a></li><li class="chapter-item expanded "><a href="chapter_4_7.html">4.7 BFD库</a></li><li class="chapter-item expanded "><a href="chapter_4_8.html">4.8 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_5.html">第5章 Windows PE/COFF</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_5_1.html">5.1 Windows的二进制文件格式PE/COFF</a></li><li class="chapter-item expanded "><a href="chapter_5_2.html">5.2 PE的前身——COFF</a></li><li class="chapter-item expanded "><a href="chapter_5_3.html">5.3 链接指示信息</a></li><li class="chapter-item expanded "><a href="chapter_5_4.html">5.4 调试信息</a></li><li class="chapter-item expanded "><a href="chapter_5_5.html">5.5 大家都有符号表</a></li><li class="chapter-item expanded "><a href="chapter_5_6.html">5.6 Windows下的ELF——PE</a></li><li class="chapter-item expanded "><a href="chapter_5_7.html">5.7 本章小结</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="part_3.html">第3部分 转载与动态链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_6.html">第6章 可执行文件的装载与进程</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_6_1.html">6.1 进程虚拟地址空间</a></li><li class="chapter-item expanded "><a href="chapter_6_2.html">6.2 装载的方式</a></li><li class="chapter-item expanded "><a href="chapter_6_3.html">6.3 从操作系统角度看可执行文件的装载</a></li><li class="chapter-item expanded "><a href="chapter_6_4.html">6.4 进程虚存空间分布</a></li><li class="chapter-item expanded "><a href="chapter_6_5.html">6.5 Linux内核装载ELF过程简介</a></li><li class="chapter-item expanded "><a href="chapter_6_6.html">6.6 Windows PE的装载</a></li><li class="chapter-item expanded "><a href="chapter_6_7.html">6.7 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_7.html">第7章 动态链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_7_1.html">7.1 为什么要动态链接</a></li><li class="chapter-item expanded "><a href="chapter_7_2.html">7.2 简单的动态链接例子</a></li><li class="chapter-item expanded "><a href="chapter_7_3.html">7.3 地址无关代码</a></li><li class="chapter-item expanded "><a href="chapter_7_4.html">7.4 延迟绑定（PLT）</a></li><li class="chapter-item expanded "><a href="chapter_7_5.html">7.5 动态链接相关结构</a></li><li class="chapter-item expanded "><a href="chapter_7_6.html">7.6 动态链接的步骤和实现</a></li><li class="chapter-item expanded "><a href="chapter_7_7.html">7.7 显式运行时链接</a></li><li class="chapter-item expanded "><a href="chapter_7_8.html">7.8 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_8.html">第8章 Linux共享库的组织</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_8_1.html">8.1 共享库版本</a></li><li class="chapter-item expanded "><a href="chapter_8_2.html">8.2 符号版本</a></li><li class="chapter-item expanded "><a href="chapter_8_3.html">8.3 共享库系统路径</a></li><li class="chapter-item expanded "><a href="chapter_8_4.html">8.4 共享库查找过程</a></li><li class="chapter-item expanded "><a href="chapter_8_5.html">8.5 环境变量</a></li><li class="chapter-item expanded "><a href="chapter_8_6.html">8.6 共享库的创建和安装</a></li><li class="chapter-item expanded "><a href="chapter_8_7.html">8.7 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_9.html">第9章 Windows下的动态链接</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_9_1.html">9.1 DLL简介</a></li><li class="chapter-item expanded "><a href="chapter_9_2.html">9.2 符号导出导入表</a></li><li class="chapter-item expanded "><a href="chapter_9_3.html">9.3 DLL优化</a></li><li class="chapter-item expanded "><a href="chapter_9_4.html">9.4 C++与动态链接</a></li><li class="chapter-item expanded "><a href="chapter_9_5.html">9.5 DLL HELL</a></li><li class="chapter-item expanded "><a href="chapter_9_6.html">9.6 本章小结</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="part_4.html">第4部分 库与运行库</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_10.html">第10章 内存</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_10_1.html">10.1 程序的内存布局</a></li><li class="chapter-item expanded "><a href="chapter_10_2.html">10.2 栈与调用惯例</a></li><li class="chapter-item expanded "><a href="chapter_10_3.html">10.3 堆与内存管理</a></li><li class="chapter-item expanded "><a href="chapter_10_4.html">10.4 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_11.html">第11章 运行库</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_11_1.html">11.1 入口函数和程序初始化</a></li><li class="chapter-item expanded "><a href="chapter_11_2.html">11.2 C/C++运行库</a></li><li class="chapter-item expanded "><a href="chapter_11_3.html">11.3 运行库与多线程</a></li><li class="chapter-item expanded "><a href="chapter_11_4.html">11.4 C++全局构造与析构</a></li><li class="chapter-item expanded "><a href="chapter_11_5.html">11.5 fread实现</a></li><li class="chapter-item expanded "><a href="chapter_11_6.html">11.6 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_12.html">第12章 系统调用与API</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_12_1.html">12.1 系统调用介绍</a></li><li class="chapter-item expanded "><a href="chapter_12_2.html">12.2 系统调用原理</a></li><li class="chapter-item expanded "><a href="chapter_12_3.html">12.3 Windows API</a></li><li class="chapter-item expanded "><a href="chapter_12_4.html">12.4 本章小结</a></li></ol></li><li class="chapter-item expanded "><a href="chapter_13.html">第13章 运行库实现</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter_13_1.html">13.1 C语言运行库</a></li><li class="chapter-item expanded "><a href="chapter_13_2.html">13.2 如何使用Mini CRT</a></li><li class="chapter-item expanded "><a href="chapter_13_3.html">13.3 C++运行库实现</a></li><li class="chapter-item expanded "><a href="chapter_13_4.html">13.4 如何使用Mini CRT++</a></li><li class="chapter-item expanded "><a href="chapter_13_5.html">13.5 本章小结</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="appendix_a.html">附录A</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="appendix_a_1.html">A.1 字节序（Byte Order）</a></li><li class="chapter-item expanded "><a href="appendix_a_2.html">A.2 ELF常见段</a></li><li class="chapter-item expanded "><a href="appendix_a_3.html">A.3 常用开发工具命令行参考</a></li></ol></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
