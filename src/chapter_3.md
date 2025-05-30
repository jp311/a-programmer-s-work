# 第3章 目标文件里有什么

[3.1 目标文件的格式](chapter_3_1.md)

[3.2 目标文件是什么样的](chapter_3_2.md)

[3.3 挖掘SimpleSection.o](chapter_3_3.md)

[3.4 ELF文件结构描述](chapter_3_4.md)

[3.5 链接的接口——符号](chapter_3_5.md)

[3.6 调试信息](chapter_3_6.md)

[3.7 本章小结](chapter_3_7.md)

编译器编译源代码后生成的文件叫做目标文件，那么目标文件里面到底存放的是什么呢？或者我们的源代码在经过编译以后是怎么存储的？我们将在这一节剥开目标文件的层层外壳，去探索它最本质的内容。

目标文件从结构上讲，它是已经编译后的可执行文件格式，只是还没有经过链接的过程，其中可能有些符号或有些地址还没有被调整。其实它本身就是按照可执行文件格式存储的，只是跟真正的可执行文件在结构上稍有不同。

可执行文件格式涵盖了程序的编译、链接、装载和执行的各个方面。了解它的结构并深入剖析它对于认识系统、了解背后的机理大有好处。
