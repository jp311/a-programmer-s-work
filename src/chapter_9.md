# 第9章 Windows下的动态链接

9.1 DLL简介

9.2 符号导出导入表

9.3 DLL优化

9.4 C++与动态链接

9.5 DLL HELL

9.6 本章小结

Windows下的PE的动态链接与Linux下的ELF动态链接相比，有很多类似的地方，但也有很多不同的地方。我们在前面已经介绍过了PE的基本结构，这一章我们将围绕着PE与Windows的动态链接来展开，介绍PE的符号导入导出机制、重定位和DLL的创建与安装以及DLL的性能等一系列问题。
