## 13.4 如何使用Mini CRT++

我们的Mini CRT终于完成了对C++的支持，同时它也升级为了Mini
CRT++。与12.3节一样，在这一节中将介绍如何编译并且在自己的程序中使用它。首先展示在Windows下编译的方法：

    $cl /c /DWIN32 /GS- entry.c malloc.c printf.c stdio.c string.c atexit.c
    $cl /c /DWIN32 /GS- /GR- crtbegin.cpp crtend.cpp ctor.cpp new_delete.cpp iostream.cpp
    $lib entry.obj malloc.obj printf.obj stdio.obj string.obj ctor.obj new_delete.obj atexit.obj iostream.obj /OUT:minicrt.lib

> 这里新增的一个编译参数为/GR-，它的意思是关闭RTTI功能，否则编译器会为有虚函数的类产生RTTI相关代码，在最终链接时会看到"const
> type_info::\`vftable"符号未定义的错误。

而MiniCRT++为了能够在Linux下正常运行，还须要建立一个新的源代码文件叫做sysdep.cpp，用于定义Linux平台相关的一个函数:

    extern "C" {
        void* __dso_handle = 0;
    }

> 这个函数是用于处理共享库的全局对象构造与析构的。我们知道共享库也可以拥有全局对象，这些对象在共享库被装载和卸载时必须被正确地构造和析构。而共享库有可能在进程退出之前被卸载，比如使用dlopen/dlclose就可能导致这种情况。那么一个问题就产生了，如何使得属于某个共享库的全局对象析构函数在共享库被卸载时运行呢？GCC的做法是向\_\_cxa_atexit()传递一个参数，这个参数用于标示这个析构函数属于哪个共享对象。我们在前面实现\_\_cxa_atexit()时忽略了第三个参数，实际上这第三个参数就是用于标示共享对象的，它就是\_\_dso_handle这个符号。由于在MiniCRT++中并不考虑对共享库的支持，于是我们就仅仅定义这个符号为0，以防止链接时出现符号未定义错误。

Mini CRT++在Linux平台下编译的方法如下：

    $gcc -c -fno-builtin -nostdlib -fno-stack-protector entry.c malloc.c stdio.c string.c printf.c atexit.c
    $g++ -c -nostdinc++ -fno-rtti -fno-exceptions -fno-builtin -nostdlib -fno-stack-protector crtbegin.cpp crtend.cpp c    tor.cpp new_delete.cpp sysdep.cpp iostream.cpp sysdep.cpp
    $ar -rs minicrt.a malloc.o printf.o stdio.o string.o ctor.o atexit.o iostream.o new_delete.o sysdep.o

> -fno-rtti的作用与cl的/GR-作用一样，用于关闭RTTI。
>
> -fno-exceptions的作用用于关闭异常支持，否则GCC会产生异常支持代码，可能导致链接错误。

在Windows下使用Mini CRT++的方法如下：

    $cl /c /DWIN32 /GR- test.cpp
    $link test.obj minicrt.lib kernel32.lib /NODEFAULTLIB /entry:mini_crt_entry

在Linux下使用Mini CRT++的方法如下：

    $g++ -c -nostdinc++ -fno-rtti -fno-exceptions -fno-builtin -nostdlib -fno-stack-protector test.cpp
    $ld -static -e mini_crt_entry entry.o crtbegin.o test.o minicrt.a crtend.o -o test

> **注意**
>
> crtbegin.o和crtend.o在ld链接时位于用户目标文件的最开始和最后端，以保证链接的正确性。
