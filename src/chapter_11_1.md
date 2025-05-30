## 11.1 入口函数和程序初始化

### 11.1.1 程序从main开始吗

正如基督徒认为世界的诞生起于7天创世一样，任何一个合格的C/C++程序员都应该知道一个事实：程序从main函数开始。但是事情的真相真是如此吗？如果你善于观察，就会发现当程序执行到main函数的第一行时，很多事情都已经完成了：

【铁证1】下面是一段C语言代码：

    #include <stdio.h>
    #include <stdlib.h>

    int a = 3;

    int main(int argc, char* argv[])
    {
        int * p = (int *)malloc(sizeof(int));
        scanf("%d", p);
        printf("%d", a + *p);
        free(p);
    }

从代码中我们可以看到，在程序刚刚执行到main的时候，全局变量的初始化过程已经结束了（a的值已经确定），main函数的两个参数（argc和argv）也被正确传了进来。此外，在你不知道的时候，堆和栈的初始化悄悄地完成了，一些系统I/O也被初始化了，因此可以放心地使用printf和malloc。

【铁证2】而在C++里，main之前能够执行的代码还会更多，例如如下代码：

    #include <string>
    using namespace std;
    string v;
    double foo()
    {
        return 1.0;
    }

    double g = foo();
    int main(){}

在这里，对象v的构造函数，以及用于初始化全局变量g的函数foo都会在main之前调用。

【铁证3】atexit也是一个特殊的函数。atexit接受一个函数指针作为参数，并保证在程序正常退出（指从main里返回或调用exit函数）时，这个函数指针指向的函数会被调用。例如：

    void foo(void)
    {
        printf("bye!\n");
    }
    int main()
    {
        atexit(&foo);
        printf("endof main\n");
    }

用atexit函数注册的函数的调用时机是在main结束之后，因此这段代码的输出是：

    endof main
    bye!

所有这些事实都在为"main创论"提供不利的证据：操作系统装载程序之后，首先运行的代码并不是main的第一行，而是某些别的代码，这些代码负责准备好main函数执行所需要的环境，并且负责调用main函数，这时候你才可以在main函数里放心大胆地写各种代码：申请内存、使用系统调用、触发异常、访问I/O。在main返回之后，它会记录main函数的返回值，调用atexit注册的函数，然后结束进程。

运行这些代码的函数称为入口函数或入口点（Entry
Point），视平台的不同而有不同的名字。程序的入口点实际上是一个程序的初始化和结束部分，它往往是运行库的一部分。一个典型的程序运行步骤大致如下：

- 操作系统在创建进程后，把控制权交到了程序的入口，这个入口往往是运行库中的某个入口函数。
- 入口函数对运行库和程序运行环境进行初始化，包括堆、I/O、线程、全局变量构造，等等。
- 入口函数在完成初始化之后，调用main函数，正式开始执行程序主体部分。
- main函数执行完毕以后，返回到入口函数，入口函数进行清理工作，包括全局变量析构、堆销毁、关闭I/O等，然后进行系统调用结束进程。

### 11.1.2 入口函数如何实现

大部分程序员在平时都接触不到入口函数，为了对入口函数进行详细的了解，本节我们将深入剖析glibc和MSVC的入口函数实现。

#### GLIBC入口函数

glibc的启动过程在不同的情况下差别很大，比如静态的glibc和动态的glibc的差别，glibc用于可执行文件和用于共享库的差别，这样的差别可以组合出4种情况，这里只选取最简单的静态glibc用于可执行文件的时候作为例子，其他情况诸如共享库的全局对象构造和析构跟例子中稍有出入，我们在本书中不一一详述了，有兴趣的读者可以根据这里的介绍自己阅读glibc和gcc的源代码，相信能起到举一反三的效果。下面所有关于Glibc和MSVC
CRT的相关代码分析在不额外说明的情况下，都默认为静态/可执行文件链接的情况。

读者可以免费下载到Linux下glibc的源代码，在其中的子目录libc/csu里，有关于程序启动的代码。glibc的程序入口为_start（这个入口是由ld链接器默认的链接脚本所指定的，我们也可以通过相关参数设定自己的入口）。\_start由汇编实现，并且和平台相关，下面可以单独看i386的_start实现：

    libc\sysdeps\i386\elf\Start.S:
    _start:
        xorl %ebp, %ebp
        popl %esi
        movl %esp, %ecx

        pushl %esp
        pushl %edx    
        pushl $__libc_csu_fini
        pushl $__libc_csu_init
        pushl %ecx    
        pushl %esi    
        pushl main
        call __libc_start_main 

        hlt

这里省略了一些不重要的代码，可以看到_start函数最终调用了名为\_\_lib_start_main的函数。加粗部分的代码是对该函数的完整调用过程，其中开始的7个压栈指令用于给函数传递参数。在最开始的地方还有3条指令，它们的作用分别为：

- xor %ebp,
  %ebp：这其实是让ebp寄存器清零。xor的用处是把后面的两个操作数异或，结果存储在第一个操作数里。这样做的目的表明当前是程序的最外层函数。

  ebp设为0正好可以体现出这个最外层函数的尊贵地位。

- pop %esi及mov %esp,
  %ecx：在调用_start前，装载器会把用户的参数和环境变量压入栈中，按照其压栈的方法，实际上栈顶的元素是argc，而接着其下就是argv和环境变量的数组。图11-1为此时的栈布局，其中虚线箭头是执行pop
  %esi之前的栈顶（%esp），而实线箭头是执行之后的栈顶（%esp）。

  ![](../Images/11-1.jpg)\
  图11-1 环境变量和参数数组

pop %esi将argc存入了esi，而mov
%esp、%ecx将栈顶地址（此时就是argv和环境变量（env）数组的起始地址）传给%ecx。现在%esi指向argc，%ecx指向argv及环境变量数组。

综合以上分析，我们可以把_start改写为一段更具有可读性的伪代码：

    void _start()
    {
        %ebp = 0;
        int argc = pop from stack
        char** argv = top of stack;
        __libc_start_main( main, argc, argv, __libc_csu_init, __libc_csu_fini, 
                           edx, top of stack );
    }

其中argv除了指向参数表外，还隐含紧接着环境变量表。这个环境变量表要在\_\_libc_start_main里从argv内提取出来。

> **环境变量**
>
> 环境变量是存在于系统中的一些公用数据，任何程序都可以访问。通常来说，环境变量存储的都是一些系统的公共信息，例如系统搜索路径，当前OS版本等。环境变量的格式为key=value的字符串，C语言里可以使用getenv这个函数来获取环境变量信息。
>
> 在Windows里，可以直接在控制面板→系统→高级→环境变量查阅当前的环境变量，而在Linux下，直接在命令行里输入export即可。

实际执行代码的函数是\_\_libc_start_main，由于代码很长，下面我们一段一段地看：

    _start -> __libc_start_main:

    int __libc_start_main (
                int (*main) (int, char **, char **),
                int argc, 
                char * __unbounded *__unbounded ubp_av,
                __typeof (main) init,
                void (*fini) (void),
                void (*rtld_fini) (void), 
                void * __unbounded stack_end)
    {
    #if __BOUNDED_POINTERS__
        char **argv;
    #else
    # define argv ubp_av
    #endif
          int result;

这是\_\_libc_start_main的函数头部，可见和_start函数里的调用一致，一共有7个参数，其中main由第一个参数传入，紧接着是argc和argv（这里称为ubp_av，因为其中还包含了环境变量表）。除了main的函数指针之外，外部还要传入3个函数指针，分别是：

- init：main调用前的初始化工作。
- fini：main结束后的收尾工作。
- rtld_fini：和动态加载有关的收尾工作，rtld是runtime loader的缩写。

最后的stack_end标明了栈底的地址，即最高的栈地址。

> **bounded pointer**
>
> GCC支持bounded类型指针（bounded指针用\_\_bounded关键字标出，若默认为bounded指针，则普通指针用\_\_unbounded标出），这种指针占用3个指针的空间，在第一个空间里存储原指针的值，第二个空间里存储下限值，第三个空间里存储上限值。\_\_ptrvalue、\_\_ptrlow、\_\_ptrhigh
> 分别返回这3个值，有了3个值以后，内存越界错误便很容易查出来了。
> 并且要定义\_\_BOUNDED_POINTERS\_\_这个宏才有作用，否则这3个宏定义是空的。
>
> 不过，尽管bounded指针看上去似乎很有用，但是这个功能却在2003年被去掉了。因此现在所有关于bounded指针的关键字其实都是一个空的宏。鉴于此，我们接下来在讨论libc代码时都默认不使用bounded指针（即不定义\_\_BOUNDED_POINTERS\_\_）。

接下来的代码如下：

    char** ubp_ev = &ubp_av[argc + 1];
    INIT_ARGV_and_ENVIRON;
    __libc_stack_end = stack_end;

INIT_ARGV_and_ENVIRON这个宏定义于libc/sysdeps/generic/bp-start.h，展开后本段代码变为：

    char** ubp_ev = &ubp_av[argc + 1];
    __environ = ubp_ev;
    __libc_stack_end = stack_end;

图11-2实际上就是我们根据从_start源代码分析得到的栈布局，让\_\_environ指针指向原来紧跟在argv数组之后的环境变量数组。

![](../Images/11-2.jpg)\
图11-2 环境变量和参数数组（2）

图11-2中实线箭头代表ubp_av，而虚线箭头代表\_\_environ。另外这段代码还将栈底地址存储在一个全局变量里，以留作它用。

为什么要分两步赋值给\_\_environ呢？这又是为了兼容bounded惹的祸。实际上，INIT_ARGV_and_ENVIRON根据bounded支持的情况有多个版本，以上仅仅是假定不支持bounded的版本。

接下来有另一个宏：

    DL_SYSDEP_OSCHECK (__libc_fatal);

这是用来检查操作系统的版本，宏的具体内容就不列出了。接下来的代码颇为繁杂，我们过滤掉大量信息之后，将一些关键的函数调用列出：

    __pthread_initialize_minimal();
    __cxa_atexit(rtld_fini, NULL, NULL);
    __libc_init_first (argc, argv, __environ);
    __cxa_atexit(fini, NULL, NULL);
    (*init)(argc, argv, __environ);

这一部分进行了一连串的函数调用，注意到\_\_cxa_atexit函数是glibc的内部函数，等同于atexit，用于将参数指定的函数在main结束之后调用。所以以参数传入的fini和rtld_fini均是用于main结束之后调用的。在\_\_libc_start_main的末尾，关键的是这两行代码：

        result = main (argc, argv, __environ);
        exit (result);
    }

在最后，main函数终于被调用，并退出。然后我们来看看exit的实现：

    _start -> __libc_start_main -> exit:

    void exit (int status)
    {
        while (__exit_funcs != NULL)
        {
            ...
            __exit_funcs = __exit_funcs->next;
        }
        ...
        _exit (status);
    }

其中\_\_exit_funcs是存储由\_\_cxa_atexit和atexit注册的函数的链表，而这里的这个while循环则遍历该链表并逐个调用这些注册的函数，由于其中琐碎代码过多，这里就不具体列出了。最后的_exit函数由汇编实现，且与平台相关，下面列出i386的实现：

    _start -> __libc_start_main -> exit -> _exit:

    _exit:
        movl    4(%esp), %ebx
        movl    $__NR_exit, %eax
        int     $0x80
        hlt

可见_exit的作用仅仅是调用了exit这个系统调用。也就是说，\_exit调用后，进程就会直接结束。程序正常结束有两种情况，一种是main函数的正常返回，一种是程序中用exit退出。在\_\_libc_start_main里我们可以看到，即使main返回了，exit也会被调用。exit是进程正常退出的必经之路，因此把调用用atexit注册的函数的任务交给exit来完成可以说万无一失。

> **注意**
>
> 我们看到在_start和_exit的末尾都有一个hlt指令，这是作什么用的呢？在Linux里，进程必须使用exit系统调用结束。一旦exit被调用，程序的运行就会终止，因此实际上_exit末尾的hlt不会执行，从而\_\_libc_start_main永远不会返回，以至_start末尾的hlt指令也不会执行。\_exit里的hlt指令是为了检测exit系统调用是否成功。如果失败，程序就不会终止，hlt指令就可以发挥作用强行把程序给停下来。而_start里的hlt的用处也是如此，但是为了预防某种没有调用exit（这里指的不是exit系统调用）就回到_start的情况（例如有人误删了\_\_libc_main_start末尾的exit）。

#### MSVC CRT入口函数

相信读者对glibc的入口函数已经有了一些了解。但可惜的是glibc的入口函数书写得不是非常直观。事实上，我们也没从glibc的入口函数了解到多少内容。为了从另一面看世界，我们再来看看Windows下的运行库的实现细节。下面是Microsoft
Visual Studio
2003里crt0.c（位于VC安装目录的crt\\src）的一部分。这里也删除了一些条件编译的代码，留下了比较重要的部分。MSVC的CRT默认的入口函数名为mainCRTStartup：

    int mainCRTStartup(void)
    {
        ...

这是入口函数的头部。下面的代码出现于该函数的开头，显得杂乱无章。不过其中关键的内容是给一系列变量赋值：

        posvi = (OSVERSIONINFOA *)_alloca(sizeof(OSVERSIONINFOA));
        posvi->dwOSVersionInfoSize = sizeof(OSVERSIONINFOA);
        
        GetVersionExA(posvi);
        _osplatform = posvi->dwPlatformId;
        _winmajor = posvi->dwMajorVersion;
        _winminor = posvi->dwMinorVersion;
        _osver = (posvi->dwBuildNumber) & 0x07fff;

        if ( _osplatform != VER_PLATFORM_WIN32_NT )
            _osver |= 0x08000;

        _winver = (_winmajor << 8) + _winminor;

被赋值的这些变量，是VC7里面预定义的一些全局变量，其中_osver和_winver表示操作系统的版本，\_winmajor是主版本号，更具体的可以查阅MSDN。这段代码通过调用GetVersionExA（这是一个Windows
API）来获得当前的操作系统版本信息，并且赋值给各个全局变量。

> 为什么这里为posvi分配内存不使用malloc而使用alloca呢？是因为在程序的一开始堆还没有被初始化，而alloca是唯一可以不使用堆的动态分配机制。alloca可以在栈上分配任意大小的空间（只要栈的大小允许），并且在函数返回的时候会自动释放，就好像局部变量一样。

由于没有初始化堆，所以很多事情没法做，当务之急是赶紧把堆先初始化了：

    if ( !_heap_init(0) )            
          fast_error_exit(_RT_HEAPINIT);  

这里使用_heap_init函数对堆（heap）进行了初始化，如果堆初始化失败，那么程序就直接退出了。

    __try {
            if ( _ioinit() < 0 )
                _amsg_exit(_RT_LOWIOINIT);

            _acmdln = (char *)GetCommandLineA();
            _aenvptr = (char *)__crtGetEnvironmentStringsA();

            if ( _setargv() < 0 )
                _amsg_exit(_RT_SPACEARG);

            if ( _setenvp() < 0 )
                _amsg_exit(_RT_SPACEENV);

            initret = _cinit(TRUE);       

            if (initret != 0)
                    _amsg_exit(initret);
            __initenv = _environ;

            mainret = main(__argc, __argv, _environ);

            _cexit();
        }
    __except ( _XcptFilter(GetExceptionCode(), GetExceptionInformation()) )
        {
            mainret = GetExceptionCode();
            _c_exit();
        } /* end of try - except */
        return mainret;
    }

这里是一个Windows的SEH的try-except块，里面做了什么呢？首先使用_ioinit函数初始化了I/O，接下来这段代码调用了一系列函数进行各种初始化，包括：

- \_setargv：初始化main函数的argv参数。
- \_setenv：设置环境变量。
- \_cinit：其他的C库设置。

在最后，可以看到函数调用了main函数并获得了其返回值。try-except块的except部分是最后的清理阶段，如果try块里的代码发生异常，则在这里进行错误处理。最后退出并返回main的返回值。

#### try-except块

try-except块是Windows结构化异常处理机制SEH的一部分。try-except块的使用方法如下：

    __try {
        code 1
    }
    __except(...) {
        code 2
    }

当code 1出现异常（段错误等）的时候，except部分的code
2会执行以异常处理。更为详细的信息请查阅MSDN。

总结一下，这个mainCRTStartup的总体流程就是：

1.  初始化和OS版本有关的全局变量。
2.  初始化堆。
3.  初始化I/O。
4.  获取命令行参数和环境变量。
5.  初始化C库的一些数据。
6.  调用main并记录返回值。
7.  检查错误并将main的返回值返回。

事实上还是MSVC的入口函数的思路较为清晰。在第13章里，我们将仿照VC入口函数的思路实现一个Linux下的简易入口函数。

> **Q&A**
>
> **Q：**msvc的入口函数使用了alloca，它是如何实现的。
>
> **A：**alloca函数的特点是它能够动态地在栈上分配内存，在函数退出时如同局部变量一样自动释放。结合之前我们介绍的函数标准进入和退出指令序列就知道，函数退出时的退栈操作是直接将ESP的值赋为EBP的值。因此不管在函数的执行过程中ESP减少了多少，最后也能够成功地将函数执行时分配的所有栈空间回收。在这个基础上，alloca的实现就非常简单，仅仅是将ESP减少一定数值而已。
>
> **Q：**为什么MSVC的Win32程序的入口使用的是WinMain？
>
> **A：**WinMain和main一样，都不是程序的实际入口。MSVC的程序入口是同一段代码，但根据不同的编译参数被编译成了不同的版本。不同版本的入口函数在其中会调用不同名字的函数，包括main/wmain/WinMain/wWinMain等。

### 11.1.3 运行库与I/O

在了解了glibc和MSVC的入口函数的基本思路之后，让我们来深入了解各个初始化部分的具体实现。但在具体了解初始化之前，我们要先了解一个重要的概念：I/O。

IO（或I/O）的全称是Input/Output，即输入和输出。对于计算机来说，I/O代表了计算机与外界的交互，交互的对象可以是人或其他设备（如图11-3所示）。

![](../Images/11-3.jpg)\
图11-3 计算机的I/O设备

而对于程序来说，I/O涵盖的范围还要宽广一些。一个程序的I/O指代了程序与外界的交互，包括文件、管道、网络、命令行、信号等。更广义地讲，I/O指代任何操作系统理解为"文件"的事务。许多操作系统，包括Linux和Windows，都将各种具有输入和输出概念的实体------包括设备、磁盘文件、命令行等------统称为文件，因此这里所说的文件是一个广义的概念。

对于一个任意类型的文件，操作系统会提供一组操作函数，这包括打开文件、读文件、写文件、移动文件指针等，相信有编程经验的读者对此都不会陌生。有过C编程经验的读者应该知道，C语言文件操作是通过一个FILE结构的指针来进行的。fopen函数返回一个FILE结构的指针，而其他的函数如fwrite使用这个指针操作文件。使用文件的最简单代码如下：

    #include <stdio.h>

    int main(int argc,char** argv)
    {
        FILE* f = fopen( "test.dat", "wb" );
        if( f == NULL )
            Return -1;
        fwrite( "123", 3, 1, f );
        fclose(f);
            return 0;
    }

在操作系统层面上，文件操作也有类似于FILE的一个概念，在Linux里，这叫做文件描述符（File
Descriptor），而在Windows里，叫做句柄（Handle）（以下在没有歧义的时候统称为句柄）。用户通过某个函数打开文件以获得句柄，此后用户操纵文件皆通过该句柄进行。

设计这么一个句柄的原因在于句柄可以防止用户随意读写操作系统内核的文件对象。无论是Linux还是Windows，文件句柄总是和内核的文件对象相关联的，但如何关联细节用户并不可见。内核可以通过句柄来计算出内核里文件对象的地址，但此能力并不对用户开放。

下面举一个实际的例子，在Linux中，值为0、1、2的fd分别代表标准输入、标准输出和标准错误输出。在程序中打开文件得到的fd从3开始增长。fd具体是什么呢？在内核中，每一个进程都有一个私有的"打开文件表"，这个表是一个指针数组，每一个元素都指向一个内核的打开文件对象。而fd，就是这个表的下标。当用户打开一个文件时，内核会在内部生成一个打开文件对象，并在这个表里找到一个空项，让这一项指向生成的打开文件对象，并返回这一项的下标作为fd。由于这个表处于内核，并且用户无法访问到，因此用户即使拥有fd，也无法得到打开文件对象的地址，只能够通过系统提供的函数来操作。

在C语言里，操纵文件的渠道则是FILE结构，不难想象，C语言中的FILE结构必定和fd有一对一的关系，每个FILE结构都会记录自己唯一对应的fd。

FILE、fd、打开文件表和打开文件对象的关系如图11-4所示。

![](../Images/11-4.jpg)\
图11-4 FILE结构、fd和内核对象

图11-4中，内核指针p指向该进程的打开文件表，所以只要有fd，就可以用fd+p来得到打开文件表的某一项地址。stdin、stdout、stderr均是FILE结构的指针。

对于Windows中的句柄，与Linux中的fd大同小异，不过Windows的句柄并不是打开文件表的下标，而是其下标经过某种线性变换之后的结果。

在大致了解了I/O为何物之后，我们就能知道I/O初始化的职责是什么了。首先I/O初始化函数需要在用户空间中建立stdin、stdout、stderr及其对应的FILE结构，使得程序进入main之后可以直接使用printf、scanf等函数。

### 11.1.4 MSVC CRT的入口函数初始化

#### 系统堆初始化

MSVC的入口函数初始化主要包含两个部分，堆初始化和I/O初始化。MSVC的堆初始化由函数_heap_init完成，这个函数的定义位于heapinit.c，大致的代码如下（删去了64位系统的条件编译部分）：

    mainCRTStartup -> _heap_init()：

    HANDLE _crtheap = NULL;

    int _heap_init (int mtflag)
    {
        if ( (_crtheap = HeapCreate( mtflag ? 0 : HEAP_NO_SERIALIZE, 
            BYTES_PER_PAGE, 0 )) == NULL )
            return 0;

        return 1;
    }

在32位的编译环境下，MSVC的堆初始化过程出奇地简单，它仅仅调用了HeapCreate这个API创建了一个系统堆。因此不难想象，MSVC的malloc函数必然是调用了HeapAlloc这个API，将堆管理的过程直接交给了操作系统。

#### I/O初始化

I/O初始化相对于堆的初始化则要复杂很多。首先让我们来看看MSVC中，FILE结构的定义（FILE结构实际定义在C语言标准中并未指出，因此不同的版本可能有不同的实现）：

    struct _iobuf {
        char *_ptr;
        int   _cnt;
        char *_base;
        int   _flag;
        int   _file;
        int   _charbuf;
        int   _bufsiz;
        char *_tmpfname;
        };
    typedef struct _iobuf FILE;

这个FILE结构中最重要的一个字段是_file，\_file是一个整数，通过_file可以访问到内部文件句柄表中的某一项。在Windows中，用户态使用句柄（Handle）来访问内核文件对象，句柄本身是一个32位的数据类型，在有些场合使用int来储存，有些场合使用指针来表示。

在MSVC的CRT中，已经打开的文件句柄的信息使用数据结构ioinfo来表示：

    typedef struct {
        intptr_t osfhnd;
        char osfile;
        char pipech;
    }   ioinfo;

在这个结构中，osfhnd字段即为打开文件的句柄，这里使用8字节整数类型intptr_t来存储。另外osfile的意义为文件的打开属性。而pipech字段则为用于管道的单字符缓冲，这里可以先忽略。osfile的值可由一系列值用按位或的方式得出：

- FOPEN(0x01)句柄被打开。
- FEOFLAG(0x02)已到达文件末尾。
- FCRLF(0x04)在文本模式中，行缓冲已遇到回车符（见第11.2.2节）。
- FPIPE(0x08)管道文件。
- FNOINHERIT(0x10)句柄打开时具有属性_O_NOINHERIT（不遗传给子进程）。
- FAPPEND(0x20)句柄打开时具有属性O_APPEND（在文件末尾追加数据）。
- FDEV(0x40)设备文件。
- FTEXT(0x80)文件以文本模式打开。

在crt/src/ioinit.c中，有一个数组：

    int _nhandle;
    ioinfo * __pioinfo[64]; // 等效于ioinfo __pioinfo[64][32];

这就是用户态的打开文件表。这个表实际是一个二维数组，第二维的大小为32个ioinfo结构，因此该表总共可以容纳的元素总量为64
\* 32 =
2048个句柄。此外_nhandle记录该表的实际元素个数。之所以使用指针数组而不是二维数组的原因是使用指针数组更加节省空间，而如果使用二维数组，则不论程序里打开了几个文件都必须始终消耗2048个ioinfo的空间。

FILE结构中的_file的值，和此表的两个下标直接相关联。当我们要访问文件时，必须从FILE结构转换到操作系统的句柄。从一个FILE\*结构得到文件句柄可以通过一个叫做_osfhnd的宏，当然这个宏是CRT内部使用的，并不推荐用户使用。\_osfhnd的定义为：

    #define _osfhnd(i)  ( _pioinfo(i)->osfhnd )

其中宏函数_pioinfo的定义是：

    #define _pioinfo(i) ( __pioinfo[(i) >> 5] + ((i) & ((1 << 5) -  1)) )

FILE结构的_file字段的意义可以从_pioinfo的定义里看出，通过_file得到打开文件表的下标变换为：

FILE：\_file的第5位到第10位是第一维坐标（共6位），\_file的第0位到第4位是第二维坐标（共5位）。

这样就可以通过简单的位运算来从FILE结构得到内部句柄。通过这我们可以看出，MSVC的I/O内部结构和之前介绍的Linux的结构有些不同，如图11-5所示。

![](../Images/11-5.jpg)\
图11-5 Windows的FILE、句柄和内核对象

MSVC的I/O初始化就是要构造这个二维的打开文件表。MSVC的I/O初始化函数_ioinit定义于crt/src/ioinit.c中。首先，\_ioinit函数初始化了\_\_pioinfo数组的第一个二级数组：

    mainCRTStartup -> _ioinit()：

    if ( (pio = _malloc_crt( 32 * sizeof(ioinfo) ))
                 == NULL )
    {
        return -1;
    }

    __pioinfo[0] = pio;
    _nhandle = 32;
    for ( ; pio < __pioinfo[0] + 32 ; pio++ ) {
        pio->osfile = 0;
        pio->osfhnd = (intptr_t)INVALID_HANDLE_VALUE;
        pio->pipech = 10;
    }

在这里_ioinit初始化了的\_\_pioinfo\[0\]里的每一个元素为无效值，其中
INVALID\_
HANDLE_VALUE是Windows句柄的无效值，值为-1。接下来，\_ioinit的工作是将一些预定义的打开文件给初始化，这包括两部分：

1.  从父进程继承的打开文件句柄，当一个进程调用API创建新进程的时候，可以选择继承自己的打开文件句柄，如果继承，子进程可以直接使用父进程的打开文件句柄。
2.  操作系统提供的标准输入输出。

应用程序可以使用API
GetStartupInfo来获取继承的打开文件，GetStartupInfo的参数如下：

    void GetStartupInfo(STARTUPINFO* lpStartupInfo);

STARTUPINFO是一个结构，调用GetStartupInfo之后，该结构就会被写入各种进程启动相关的数据。在该结构中，有两个保留字段为：

    typedef struct _STARTUPINFO {
        ……
        WORD cbReserved2;
        LPBYTE lpReserved2;
        ……
    } STARTUPINFO;

这两个字段的用途没有正式的文档说明，但实际是用来传递继承的打开文件句柄。当这两个字段的值都不为0时，说明父进程遗传了一些打开文件句柄。操作系统是如何使用这两个字段传递句柄的呢？首先lpReserved2字段实际是一个指针，指向一块内存，这块内存的结构如下：

- 字节\[0,3\]：传递句柄的数量n。
- 字节\[4,
  3+n\]：每一个句柄的属性（各1字节，表明句柄的属性，同ioinfo结构的_osfile字段）。
- 字节\[4+n之后\]：每一个句柄的值（n个intptr_t类型数据，同ioinfo结构的_osfhnd字段）。

\_ioinit函数使用如下代码获取各个句柄的数据：

    cfi_len = *(__unaligned int *)(StartupInfo.lpReserved2);
    posfile = (char *)(StartupInfo.lpReserved2) + sizeof( int );
    posfhnd = (__unaligned intptr_t *)(posfile + cfi_len);

其中\_\_unaligned关键字告诉编译器该指针可能指向一个没有进行数据对齐的地址，编译器会插入一些代码来避免发生数据未对齐而产生的错误。这段代码执行之后，lpReserved2指向的数据结构会被两个指针分别指向其中的两个数组，如图11-6所示。

![](../Images/11-6.jpg)\
图11-6 句柄属性数组和句柄数组

接下来_ioinit就要将这些数据填入自己的打开文件表中。当然，首先要判断直接的打开文件表是否足以容纳所有的句柄：

    cfi_len = __min( cfi_len, 32 * 64 );

然后要给打开文件表分配足够的空间以容纳所有的句柄：

    for ( i = 1 ; _nhandle < cfi_len ; i++ ) {
        if ( (pio = _malloc_crt( 32 * sizeof(ioinfo) )) == NULL )
        {
            cfi_len = _nhandle;
            break;
        }
        __pioinfo[i] = pio;
        _nhandle += 32;
        for ( ; pio < __pioinfo[i] + 32 ; pio++ ) {
            pio->osfile = 0;
            pio->osfhnd = (intptr_t)INVALID_HANDLE_VALUE;
            pio->pipech = 10;
        }
    }

在这里，nhandle总是等于已经分配的元素数量，因此只需要每次分配一个第二维的数组，直到nhandle大于cfi_len即可。由于\_\_pioinfo\[0\]已经预先分配了，因此直接从\_\_pioinfo\[1\]开始分配即可。分配了空间之后，将数据填入就很容易了：

    for ( fh = 0 ; fh < cfi_len ; fh++, posfile++, posfhnd++ ) 
    {
        if ( (*posfhnd != (intptr_t)INVALID_HANDLE_VALUE) &&
                   (*posfile & FOPEN) &&
                   ((*posfile & FPIPE) ||
                   (GetFileType( (HANDLE)*posfhnd ) != 
                FILE_TYPE_UNKNOWN)) )
        {
            pio = _pioinfo( fh );
            pio->osfhnd = *posfhnd;
            pio->osfile = *posfile;
        }
    }

在这个循环中，fh从0开始递增，每次通过_pioinfo宏来转换为打开文件表中连续的对应元素，而posfile和posfhnd则依次递增以遍历每一个句柄的数据。在复制的过程中，一些不符合条件的句柄会被过滤掉，例如无效的句柄，或者不属于打开文件及管道的句柄，或者未知类型的句柄。

这段代码执行完成之后，继承来的句柄就全部复制完毕。接下来还须要初始化标准输入输出。当继承句柄的时候，有可能标准输入输出（fh=0,1,2）已经被继承了，因此在初始化前首先要先检验这一点，代码如下：

    for ( fh = 0 ; fh < 3 ; fh++ ) 
    {
        pio = __pioinfo[0] + fh;

        if ( pio->osfhnd == (intptr_t)INVALID_HANDLE_VALUE ) 
        {
            pio->osfile = (char)(FOPEN | FTEXT);
            if ( ((stdfh = (intptr_t)GetStdHandle( stdhndl(fh) ))
                    != (intptr_t)INVALID_HANDLE_VALUE) 
                    && ((htype =GetFileType( (HANDLE)stdfh )) 
                    != FILE_TYPE_UNKNOWN) )
            {
                pio->osfhnd = stdfh;
                if ( (htype & 0xFF) == FILE_TYPE_CHAR )
                    pio->osfile |= FDEV;
                else if ( (htype & 0xFF) == FILE_TYPE_PIPE )
                    pio->osfile |= FPIPE;
            }
            else {
                pio->osfile |= FDEV;
            }
        }
        else  {
            pio->osfile |= FTEXT;
        }
    }

如果序号为0、1、2的句柄是无效的（没有继承自父进程），那么_ioinit会使用GetStdHandle函数获取默认的标准输入输出句柄。此外，\_ioinit还会使用GetFileType来获取该默认句柄的类型，给_osfile设置对应的值。

在处理完标准数据输出的句柄之后，I/O初始化工作就完成了。我们可以看到，MSVC的I/O初始化主要进行了如下几个工作：

- 建立打开文件表。
- 如果能够继承自父进程，那么从父进程获取继承的句柄。
- 初始化标准输入输出。

在I/O初始化完成之后，所有的I/O函数就都可以自由使用了。在本节中，我们介绍了入口函数最重要的两个部分，堆初始化和I/O初始化，相信读者对程序的启动部分已经有了较深的理解。不过，入口函数只是冰山一角，它隶属的是一个庞大的代码集合。这个代码集合叫做运行库。
