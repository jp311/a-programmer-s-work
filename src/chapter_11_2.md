## 11.2 C/C++运行库

### 11.2.1 C语言运行库

任何一个C程序，它的背后都有一套庞大的代码来进行支撑，以使得该程序能够正常运行。这套代码至少包括入口函数，及其所依赖的函数所构成的函数集合。当然，它还理应包括各种标准库函数的实现。

这样的一个代码集合称之为运行时库（Runtime
Library）。而C语言的运行库，即被称为C运行库（CRT）。

如果读者拥有Visual
Studio，可以在VC/crt/src里找到一份C语言运行库的源代码。然而，由于此源代码过于庞大，仅仅.c文件就有近千个，并且和C++的STL代码一起毫无组织地堆放在一起，以至于实际上没有什么仔细阅读的可能性。同样，Linux下的libc源代码读起来也如同啃砖头。所幸的是，在本章的最后，我们会一起来实现一个简单的运行库，让大家更直观地了解它。

一个C语言运行库大致包含了如下功能：

- 启动与退出：包括入口函数及入口函数所依赖的其他函数等。
- 标准函数：由C语言标准规定的C语言标准库所拥有的函数实现。
- I/O：I/O功能的封装和实现，参见上一节中I/O初始化部分。
- 堆：堆的封装和实现，参见上一节中堆初始化部分。
- 语言实现：语言中一些特殊功能的实现。
- 调试：实现调试功能的代码。

在这些运行库的组成成分中，C语言标准库占据了主要地位并且大有来头。C语言标准库是C语言标准化的基础函数库，我们平时使用的printf、exit等都是标准库中的一部分。标准库定义了C语言中普遍存在的函数集合，我们可以放心地使用标准库中规定的函数而不用担心在将代码移植到别的平台时对应的平台上不提供这个函数。在下一章节里，我们会介绍C语言标准库的函数集合，并对一些特殊的函数集合进行详细介绍。

> **标准库的历史**
>
> 在计算机世界的历史中，C语言在AT&T的贝尔实验室诞生了。初生的C语言在功能上非常不完善，例如不提供I/O相关的函数。因此在C语言的发展过程中，C语言社区共同意识到建立一个基础函数库的必要性。与此同时，在20世纪70年代C语言变得非常流行时，许多大学、公司和组织都自发地编写自己的C语言变种和基础函数库，因此当到了80年代时，C语言已经出现了大量的变种和多种不同的基础函数库，这对代码迁移等方面造成了巨大的障碍，许多大学、公司和组织在共享代码时为了将代码在不同的C语言变种之间移植搞得焦头烂额，怨声载道。于是对此惨状忍无可忍的美国国家标准协会（American
> National Standards Institute,
> ANSI）在1983年成立了一个委员会，旨在对C语言进行标准化，此委员会所建立的C语言标准被称为ANSI
> C。第一个完整的C语言标准建立于1989年，此版本的C语言标准称为C89。在C89标准中，包含了C语言基础函数库，由C89指定的C语言基础函数库就称为ANSI
> C标准运行库（简称标准库）。其后在1995年C语言标准委员会对C89标准进行了一次修订，在此次修订中，ANSI
> C标准库得到了第一次扩充，头文件iso646.h、wchar.h和wctype.h加入了标准库的大家庭。在1999年，C99标准诞生，C语言标准库得到了进一步的扩充，头文件complex.h、fenv.h、inttypes.h、stdbool.h、stdint.h和tgmath.h进入标准库。自此，C语言标准库的面貌一直延续至今。

### 11.2.2 C语言标准库

在本章节里，我们将介绍C语言标准库的基本函数集合，并对其中一些特殊函数进行详细的介绍。ANSI
C的标准库由24个C头文件组成。与许多其他语言（如Java）的标准库不同，C语言的标准库非常轻量，它仅仅包含了数学函数、字符/字符串处理，I/O等基本方面，例如：

- 标准输入输出（stdio.h）。
- 文件操作（stdio.h）。
- 字符操作（ctype.h）。
- 字符串操作（string.h）。
- 数学函数（math.h）。
- 资源管理（stdlib.h）。
- 格式转换（stdlib.h）。
- 时间/日期（time.h）。
- 断言（assert.h）。
- 各种类型上的常数（limits.h & float.h）。

除此之外，C语言标准库还有一些特殊的库，用于执行一些特殊的操作，例如：

- 变长参数（stdarg.h）。
- 非局部跳转（setjmp.h）。

相信常见的C语言函数读者们都已经非常熟悉，因此这里就不再一一介绍，接下来让我们看看两组特殊函数的细节。

#### 1. 变长参数

变长参数是C语言的特殊参数形式，例如如下函数声明：

    int printf(const char* format, ...);

如此的声明表明，printf函数除了第一个参数类型为const
char\*之外，其后可以追加任意数量、任意类型的参数。在函数的实现部分，可以使用stdarg.h里的多个宏来访问各个额外的参数：假设lastarg是变长参数函数的最后一个具名参数（例如printf里的format），那么在函数内部定义类型为va_list的变量：

    va_list ap;

该变量以后将会依次指向各个可变参数。ap必须用宏va_start初始化一次，其中lastarg必须是函数的最后一个具名的参数。

    va_start(ap, lastarg);

此后，可以使用va_arg宏来获得下一个不定参数（假设已知其类型为type）：

    type next = va_arg(ap, type);

在函数结束前，还必须用宏va_end来清理现场。在这里我们可以讨论这几个宏的实现细节。在研究这几个宏之前，我们要先了解变长参数的实现原理。变长参数的实现得益于C语言默认的cdecl调用惯例的自右向左压栈传递方式。设想如下的函数：

    int sum(unsigned num, ...);

其语义如下：

第一个参数传递一个整数num，紧接着后面会传递num个整数，返回num个整数的和。

当我们调用：

    int n = sum(3, 16, 38, 53);

参数在栈上会形成如图11-7所示的布局。

![](../Images/11-7.jpg)\
图11-7 函数参数在栈上分布

在函数内部，函数可以使用名称num来访问数字3，但无法使用任何名称访问其他的几个不定参数。但此时由于栈上其他的几个参数实际恰好依序排列在参数num的高地址方向，因此可以很简单地通过num的地址计算出其他参数的地址。sum函数的实现如下：

    int sum(unsigned num, ...)
    {
        int* p = &num + 1;
        int ret = 0;
        while (num--)
            ret += *p++;
        return ret;
    }

在这里我们可以观察到两个事实：

1.  sum函数获取参数的量仅取决于num参数的值，因此，如果num参数的值不等于实际传递的不定参数的数量，那么sum函数可能取到错误的或不足的参数。
2.  cdecl调用惯例保证了参数的正确清除。我们知道有些调用惯例（如stdcall）是由被调用方负责清除堆栈的参数，然而，被调用方在这里其实根本不知道有多少参数被传递进来，所以没有办法清除堆栈。而cdecl恰好是调用方负责清除堆栈，因此没有这个问题。

printf的不定参数比sum要复杂得多，因为printf的参数不仅数量不定，而且类型也不定。所以printf需要在格式字符串中注明参数的类型，例如用%d表明是一个整数。printf里的格式字符串如果将类型描述错误，因为不同参数的大小不同，不仅可能导致这个参数的输出错误，还有可能导致其后的一系列参数错误。

> **【小实验】**
>
> printf的狂乱输出
>
>     #include <stdio.h>
>
>     int main()
>     {
>         printf("%lf\t%d\t%c\n", 1, 666, 'a');
>     }
>
> 在这个程序里，printf的第一个输出参数是一个int（4字节），而我们告诉printf它是一个double（8字节以上），因此printf的输出会错误，由于printf在读取double的时候实际造成了越界，因此后面几个参数的输出也会失败。该程序的实际输出为（根据实际编译器和环境可能不同）：
>
>     0.000000   97
>
> 下面让我们来看va_list等宏应该如何实现。
>
> va_list实际是一个指针，用来指向各个不定参数。由于类型不明，因此这个va_list以void\*或char\*为最佳选择。
>
> va_start将va_list定义的指针指向函数的最后一个参数后面的位置，这个位置就是第一个不定参数。
>
> va_arg获取当前不定参数的值，并根据当前不定参数的大小将指针移向下一个参数。
>
> va_end将指针清0。
>
> 按照以上思路，va系列宏的一个最简单的实现就可以得到了，如下所示：
>
>     #define va_list char*
>     #define va_start(ap,arg) (ap=(va_list)&arg+sizeof(arg))
>     #define va_arg(ap,t) (*(t*)((ap+=sizeof(t))-sizeof(t)))
>     #define va_end(ap) (ap=(va_list)0)

> **【小提示】**
>
> 变长参数宏
>
> 在很多时候我们希望在定义宏的时候也能够像print一样可以使用变长参数，即宏的参数可以是任意个，这个功能可以由编译器的变长参数宏实现。在GCC编译器下，变长参数宏可以使用"##"宏字符串连接操作实现，比如：
>
>     #define printf(args…) fprintf(stdout, ##args)
>
> 而在MSVC下，我们可以使用\_\_VA_ARGS\_\_这个编译器内置宏，比如：
>
>     #define printf(…) fprintf(stdout,__VA_ARGS__)
>
> 它的效果与前面的GCC下使用##的效果一样。

#### 2. 非局部跳转

非局部跳转即使在C语言里也是一个备受争议的机制。使用非局部跳转，可以实现从一个函数体内向另一个事先登记过的函数体内跳转，而不用担心堆栈混乱。下面让我们来看一个示例：

    #include <setjmp.h>
    #include <stdio.h>
    jmp_buf b;
    void f()
    {
        longjmp(b, 1);
    }
    int main()
    {
        if (setjmp(b))
            printf("World!");
        else
        {
            printf("Hello ");
            f();
        }
    }

这段代码按常理不论setjmp返回什么，也只会打印出"Hello
"和"World！"之一，然而事实上的输出是：

    Hello World!

实际上，当setjmp正常返回的时候，会返回0，因此会打印出"Hello
"的字样。而longjmp的作用，就是让程序的执行流回到当初setjmp返回的时刻，并且返回由longjmp指定的返回值（longjmp的参数2），也就是1，自然接着会打印出"World！"并退出。换句话说，longjmp可以让程序"时光倒流"回setjmp返回的时刻，并改变其行为，以至于改变了未来。

是的，这绝对不是结构化编程。😐

### 11.2.3 glibc与MSVC CRT

运行库是平台相关的，因为它与操作系统结合得非常紧密。C语言的运行库从某种程度上来讲是C语言的程序和不同操作系统平台之间的抽象层，它将不同的操作系统API抽象成相同的库函数。比如我们可以在不同的操作系统平台下使用fread来读取文件，而事实上fread在不同的操作系统平台下的实现是不同的，但作为运行库的使用者我们不需要关心这一点。虽然各个平台下的C语言运行库提供了很多功能，但很多时候它们毕竟有限，比如用户的权限控制、操作系统线程创建等都不是属于标准的C语言运行库。于是我们不得不通过其他的办法，诸如绕过C语言运行库直接调用操作系统API或使用其他的库。Linux和Windows平台下的两个主要C语言运行库分别为glibc（GNU
C Library）和MSVCRT（Microsoft Visual C
Run-time），我们在下面将会分别介绍它们。

值得注意的是，像线程操作这样的功能并不是标准的C语言运行库的一部分，但是glibc和MSVCRT都包含了线程操作的库函数。比如glibc有一个可选的pthread库中的pthread_create()函数可以用来创建线程；而MSVCRT中可以使用_beginthread()函数来创建线程。所以glibc和MSVCRT事实上是标准C语言运行库的超集，它们各自对C标准库进行了一些扩展。

#### glibc

glibc即GNU C Library，是GNU旗下的C标准库。最初由自由软件基金会FSF（Free
Software
Foundation）发起开发，目的是为GNU操作系统开发一个C标准库。GNU操作系统的最初计划的内核是Hurd，一个微内核的构架系统。Hurd因为种种原因开发进展缓慢，而Linux因为它的实用性而逐渐风靡，最后取代Hurd成了GNU操作系统的内核。于是glibc从最初开始支持Hurd到后来渐渐发展成同时支持Hurd和Linux，而且随着Linux的越来越流行，glibc也主要关注Linux下的开发，成为了Linux平台的C标准库。

20世纪90年代初，在glibc成为Linux下的C运行库之前，Linux的开发者们因为开发的需要，从Linux内核代码里面分离出了一部分代码，形成了早期Linux下的C运行库。这个C运行库又被称为Linux
libc。这个版本的C运行库被维护了很多年，从版本2一直开发到版本5。如果你去看早期版本的Linux，会发现/lib目录下面有libc.so.5这样的文件，这个文件就是第五个版本的Linux
libc。1996年FSF发布了glibc
2.0，这个版本的glibc开始支持诸多特性，比如它完全支持POSIX标准、国际化、IPv6、64-位数据访问、多线程及改进了代码的可移植性。在此时Linux
libc的开发者也认识到单独地维护一份Linux下专用的C运行库是没有必要的，于是Linux开始采用glibc作为默认的C运行库，并且将2.x版本的glibc看作是Linux
libc的后继版本。于是我们可以看到，glibc在/lib目录下的.so文件为libc.so.6，即第六个libc版本，而且在各个Linux发行版中，glibc往往被称为libc6。glibc在Linux平台下占据了主导地位之后，它又被移植到了其他操作系统和其他硬件平台，诸如FreeBSD、NetBSD等，而且它支持数十种CPU及嵌入式平台。目前最新的glibc版本号是2.8（2008年4月）。

20世纪90年代初，在glibc成为Linux下的C运行库之前，Linux的开发者们因为开发的需要，从Linux内核代码里面分离出了一部分代码，形成了早期Linux下的C运行库。这个C运行库又被称为Linux
libc。这个版本的C运行库被维护了很多年，从版本2一直开发到版本5。如果你去看早期版本的Linux，会发现/lib目录下面有libc.so.5这样的文件，这个文件就是第五个版本的Linux
libc。1996年FSF发布了glibc
2.0，这个版本的glibc开始支持诸多特性，比如它完全支持POSIX标准、国际化、IPv6、64-位数据访问、多线程及改进了代码的可移植性。在此时Linux
libc的开发者也认识到单独地维护一份Linux下专用的C运行库是没有必要的，于是Linux开始采用glibc作为默认的C运行库，并且将2.x版本的glibc看作是Linux
libc的后继版本。于是我们可以看到，glibc在/lib目录下的.so文件为libc.so.6，即第六个libc版本，而且在各个Linux发行版中，glibc往往被称为libc6。glibc在Linux平台下占据了主导地位之后，它又被移植到了其他操作系统和其他硬件平台，诸如FreeBSD、NetBSD等，而且它支持数十种CPU及嵌入式平台。目前最新的glibc版本号是2.8（2008年4月）。

glibc的发布版本主要由两部分组成，一部分是头文件，比如stdio.h、stdlib.h等，它们往往位于/usr/include；另外一部分则是库的二进制文件部分。二进制部分主要的就是C语言标准库，它有静态和动态两个版本。动态的标准库我们及在本书的前面章节中碰到过了，它位于/lib/libc.so.6；而静态标准库位于/usr/lib/libc.a。事实上glibc除了C标准库之外，还有几个辅助程序运行的运行库，这几个文件可以称得上是真正的"运行库"。它们就是/usr/lib/crt1.o、/usr/lib/crti.o和/usr/lib/crtn.o。是不是对这几个文件还有点印象呢？我们在第2章讲到静态库链接的时候已经碰到过它们了，虽然它们都很小，但这几个文件都是程序运行的最关键的文件。

#### glibc启动文件

crt1.o里面包含的就是程序的入口函数_start，由它负责调用\_\_libc_start_main初始化libc并且调用main函数进入真正的程序主体。实际上最初开始的时候它并不叫做crt1.o，而是叫做crt.o，包含了基本的启动、退出代码。由于当时有些链接器对链接时目标文件和库的顺序有依赖性，crt.o这个文件必须被放在链接器命令行中的所有输入文件中的第一个，为了强调这一点，crt.o被更名为crt0.o，表示它是链接时输入的第一个文件。

后来由于C++的出现和ELF文件的改进，出现了必须在main()函数之前执行的全局/静态对象构造和必须在main()函数之后执行的全局/静态对象析构。为了满足类似的需求，运行库在每个目标文件中引入两个与初始化相关的段".init"和".finit"。运行库会保证所有位于这两个段中的代码会先于/后于main()函数执行，所以用它们来实现全局构造和析构就是很自然的事情了。链接器在进行链接时，会把所有输入目标文件中的".init"和".finit"按照顺序收集起来，然后将它们合并成输出文件中的".init"和".finit"。但是这两个输出的段中所包含的指令还需要一些辅助的代码来帮助它们启动（比如计算GOT之类的），于是引入了两个目标文件分别用来帮助实现初始化函数的crti.o和crtn.o。

与此同时，为了支持新的库和可执行文件格式，crt0.o也进行了升级，变成了crt1.o。crt0.o和crt1.o之间的区别是crt0.o为原始的，不支持".init"和".finit"的启动代码，而crt1.o是改进过后，支持".init"和".finit"的版本。这一点我们从反汇编crt1.o可以看到，它向libc启动函数\_\_libc_start_main()传递了两个函数指针"\_\_libc_csu_init"和"\_\_libc_csu_fini"，这两个函数负责调用_init()和_finit()，我们在后面"C++全局构造和析构"的章节中还会详细分析。

与此同时，为了支持新的库和可执行文件格式，crt0.o也进行了升级，变成了crt1.o。crt0.o和crt1.o之间的区别是crt0.o为原始的，不支持".init"和".finit"的启动代码，而crt1.o是改进过后，支持".init"和".finit"的版本。这一点我们从反汇编crt1.o可以看到，它向libc启动函数\_\_libc_start_main()传递了两个函数指针"\_\_libc_csu_init"和"\_\_libc_csu_fini"，这两个函数负责调用_init()和_finit()，我们在后面"C++全局构造和析构"的章节中还会详细分析。

为了方便运行库调用，最终输出文件中的".init"和".finit"两个段实际上分别包含的是_init()和_finit()这两个函数，我们在关于运行库初始化的部分也会看到这两个函数，并且在C++全局构造和析构的章节中也会分析它们是如何实现全局构造和析构的。crti.o和crtn.o这两个目标文件中包含的代码实际上是_init()函数和_finit()函数的开始和结尾部分，当这两个文件和其他目标文件安装顺序链接起来以后，刚好形成两个完整的函数_init()和_finit()。我们用objdump可以查看这两个文件的反汇编代码：

    $ objdump -dr /usr/lib/crti.o

    crti.o:     file format elf32-i386

    Disassembly of section .init:

    00000000 <_init>:
       0:   55                      push   %ebp
       1:   89 e5                   mov    %esp,%ebp
       3:   53                      push   %ebx
       4:   83 ec 04                sub    $0x4,%esp
       7:   e8 00 00 00 00          call   c <_init+0xc>
       c:   5b                      pop    %ebx
       d:   81 c3 03 00 00 00       add    $0x3,%ebx
                            f: R_386_GOTPC  _GLOBAL_OFFSET_TABLE_
      13:   8b 93 00 00 00 00       mov 0x0(%ebx),%edx
                            15: R_386_GOT32 __gmon_start__
      19:   85 d2                   test   %edx,%edx
      1b:   74 05                   je     22 <_init+0x22>
      1d:   e8 fc ff ff ff          call   1e <_init+0x1e>
                            1e: R_386_PLT32 __gmon_start__

    Disassembly of section .fini:

    00000000 <_fini>:
       0:   55                      push   %ebp
       1:   89 e5                   mov    %esp,%ebp
       3:   53                      push   %ebx
       4:   83 ec 04                sub    $0x4,%esp
       7:   e8 00 00 00 00          call   c <_fini+0xc>
       c:   5b                      pop    %ebx
       d:   81 c3 03 00 00 00       add    $0x3,%ebx
                            f: R_386_GOTPC  _GLOBAL_OFFSET_TABLE_

    $ objdump -dr /usr/lib/crtn.o

    crtn.o:     file format elf32-i386

    Disassembly of section .init:
    00000000 <.init>:
       0:   58                      pop    %eax
       1:   5b                      pop    %ebx
       2:   c9                      leave
       3:   c3                      ret
    Disassembly of section .fini:

    00000000 <.fini>:
       0:   59                      pop    %ecx
       1:   5b                      pop    %ebx
       2:   c9                      leave
       3:   c3                      ret

于是在最终链接完成之后，输出的目标文件中的".init"段只包含了一个函数_init()，这个函数的开始部分来自于crti.o的".init"段，结束部分来自于crtn.o的".init"段。为了保证最终输出文件中".init"和".finit"的正确性，我们必须保证在链接时，crti.o必须在用户目标文件和系统库之前，而crtn.o必须在用户目标文件和系统库之后。链接器的输入文件顺序一般是：

    ld crt1.o crti.o [user_objects] [system_libraries] crtn.o

由于crt1.o（crt0.o）不包含".init"段和".finit"段，所以不会影响最终生成".init"和".finit"段时的顺序。输出文件中的".init"段看上去应该如图11-8所示（对于".finit"来说也一样）。

![](../Images/11-8.jpg)\
图11-8 .init段的组成

> **提示**
>
> 在默认情况下，ld链接器会将libc、crt1.o等这些CRT和启动文件与程序的模块链接起来，但是有些时候，我们可能不需要这些文件，或者希望使用自己的libc和crt1.o等启动文件，以替代系统默认的文件，这种情况在嵌入式系统或操作系统内核编译的时候很常见。GCC提高了两个参数"-nostartfile"和"-nostdlib"，分别用来取消默认的启动文件和C语言运行库。

其实C++全局对象的构造函数和析构函数并不是直接放在.init和.finit段里面的，而是把一个执行所有构造/析构的函数的调用放在里面，由这个函数进行真正的构造和析构，我们在后面的章节还会再详细分析ELF/Glib和PE/MSVC对全局对象构造和析构的过程。

除了全局对象构造和析构之外，.init和.finit还有其他的作用。由于它们的特殊性（在main之前/后执行），一些用户监控程序性能、调试等工具经常利用它们进行一些初始化和反初始化的工作。当然我们也可以使用"\_\_attribute\_\_((section(".init")))"将函数放到.init段里面，但是要注意的是普通函数放在".init"是会破坏它们的结构的，因为函数的返回指令使得_init()函数会提前返回，必须使用汇编指令，不能让编译器产生"ret"指令。

#### GCC平台相关目标文件

就这样，在第2章中我们在链接时碰到过的诸多输入文件中，已经解决了crt1.o、crti.o和crtn.o，剩下的还有几个crtbeginT.o、libgcc.a、libgcc_eh.a、crtend.o。严格来讲，这几个文件实际上不属于glibc，它们是GCC的一部分，它们都位于GCC的安装目录下：

- /usr/lib/gcc/i486-Linux-gnu/4.1.3/crtbeginT.o
- /usr/lib/gcc/i486-Linux-gnu/4.1.3/libgcc.a
- /usr/lib/gcc/i486-Linux-gnu/4.1.3/libgcc_eh.a
- /usr/lib/gcc/i486-Linux-gnu/4.1.3/crtend.o

首先是crtbeginT.o及crtend.o，这两个文件是真正用于实现C++全局构造和析构的目标文件。那么为什么已经有了crti.o和crtn.o之后，还需要这两个文件呢？我们知道，C++这样的语言的实现是跟编译器密切相关的，而glibc只是一个C语言运行库，它对C++的实现并不了解。而GCC是C++的真正实现者，它对C++的全局构造和析构了如指掌。于是它提供了两个目标文件crtbeginT.o和crtend.o来配合glibc实现C++的全局构造和析构。事实上是crti.o和crtn.o中的".init"和".finit"提供一个在main()之前和之后运行代码的机制，而真正全局构造和析构则由crtbeginT.o和crtend.o来实现。我们在后面的章节还会详细分析它们的实现机制。

由于GCC支持诸多平台，能够正确处理不同平台之间的差异性也是GCC的任务之一。比如有些32位平台不支持64位的long
long类型的运算，编译器不能够直接产生相应的CPU指令，而是需要一些辅助的例程来帮助实现计算。libgcc.a里面包含的就是这种类似的函数，这些函数主要包括整数运算、浮点数运算（不同的CPU对浮点数的运算方法很不相同）等，而libgcc_eh.a则包含了支持C++的异常处理（Exception
Handling）的平台相关函数。另外GCC的安装目录下往往还有一个动态链接版本的libgcc.a，为libgcc_s.so。

#### MSVC CRT

相比于相对自由分散的glibc，一直伴随着不同版本的Visual C++发布的MSVC
CRT（Microsoft Visual C++ C
Runtime）倒看过去更加有序一些。从1992年最初的Visual C++
1.0版开始，一直到现在的Visual C++ 9.0（又叫做Visual C++ 2008），MSVC
CRT也从1.0版发展到了9.0版。

同一个版本的MSVC
CRT根据不同的属性提供了多种子版本，以供不同需求的开发者使用。按照静态/动态链接，可以分为静态版和动态版；按照单线程/多线程，可以分为单线程版和多线程版；按照调试/发布，可分为调试版和发布版；按照是否支持C++分为纯C运行库版和支持C++版；按照是否支持托管代码分为支持本地代码/托管代码和纯托管代码版。这些属性很多时候是相互正交的，也就是说它们之间可以相互组合。比如可以有静态单线程纯C纯本地代码调试版；也可以有动态的多线程纯C纯本地代码发布版等。但有些组合是没有的，比如动态链接版本的CRT是没有单线程的，所有的动态链接CRT都是多线程安全的。

这样的不同组合将会出现非常多的子版本，于是微软提供了一套运行库的命名方法。这个命名方法是这样的，静态版和动态版完全不同。静态版的CRT位于MSVC安装目录下的lib/，比如Visual
C++ 2008的静态库路径为"Program Files\\Microsoft Visual Studio
9.0\\VC\\lib"，它们的命名规则为：

    libc [p] [mt] [d] .lib

- p 表示 C Plusplus，即C++标准库。
- mt表示 Multi-Thread，即表示支持多线程。
- d 表示 Debug，即表示调试版本。

比如静态的非C++的多线程版CRT的文件名为libcmtd.lib。动态版的CRT的每个版本一般有两个相对应的文件，一个用于链接的.lib文件，一个用于运行时用的.dll动态链接库。它们的命名方式与静态版的CRT非常类似，稍微有所不同的是，CRT的动态链接库DLL文件名中会包含版本号。比如Visual
C++ 2005的多线程、动态链接版的DLL文件名为msvcr90.dll（Visual C++
2005的内部版本号为8.0）。表11-1列举了一些最常见的MSVC CRT版本（以Visual
C++ 2005为例）。

![](../Images/11-0-1.jpg)\
表11-1

> **注意**
>
> 自从Visual C++ 2005（MSVC
> 8.0）以后，MSVC不再提供静态链接单线程版的运行库（LIBC.lib、LIBCD.lib），因为据微软声称，经过改进后的新的多线程版的C运行库在单线程的模式下运行速度已经接近单线程版的运行库，于是没有必要再额外提供一个只支持单线程的CRT版本。

默认情况下，如果在编译链接时不指定链接哪个CRT，编译器会默认选择LIBCMT.LIB，即静态多线程CRT，Visual
C++
2005之前的版本会选择LIBC.LIB，即静态单线程版本。关于CRT的多线程和单线程的问题，我们在后面的章节还会再深入分析。

除了使用编译命令行的选项之外，在Visual
C++工程属性中也可以设置相关选项。如图11-9所示。

![](../Images/11-9.jpg)\
图11-9 Visual C++ 2003 .NET工程属性的截图

我们可以从图11-9中看到，除了多线程库以外，还有单线程静态/ML、单线程静态调试/MLd的选项。

#### C++ CRT

表11-1中的所有CRT都是指C语言的标准库，MSVC还提供了相应的C++标准库。如果你的程序是使用C++编写的，那么就需要额外链接相应的C++标准库。这里"额外"的意思是，如表11-2所列的C++标准库里面包含的仅仅是C++的内容，比如iostream、string、map等，不包含C的标准库。

![](../Images/11-0-2.jpg)\
表11-2

当你在程序里包含了某个C++标准库的头文件时，MSVC编译器就认为该源代码文件是一个C++源代码程序，它会在编译时根据编译选项，在目标文件的".drectve"段（还记得第2章中的DIRECTIVE吧？）相应的C++标准库链接信息。比如我们用C++写一个"Hello
World"程序：

    // hello.cpp
    #include <iostream>

    int main()
    {
        std::cout << "Hello world" << std::endl;
        return 0;
    }

然后将它编译成目标文件，并查看它的".drectve"段的信息：

    cl /c hello.cpp
    dumpbin /DIRECTIVES hello.obj
    Microsoft (R) COFF/PE Dumper Version 9.00.21022.08
    Copyright (C) Microsoft Corporation.  All rights reserved.


    Dump of file msvcprt.obj

    File Type: COFF OBJECT

       Linker Directives
       -----------------
       /DEFAULTLIB:"libcpmt"
       /DEFAULTLIB:"LIBCMT"
       /DEFAULTLIB:"OLDNAMES"

    cl /c /MDd hello.cpp
    dumpbin /DIRECTIVES hello.obj
    Microsoft (R) COFF/PE Dumper Version 9.00.21022.08
    Copyright (C) Microsoft Corporation.  All rights reserved.


    Dump of file msvcprt.obj

    File Type: COFF OBJECT

       Linker Directives
       -----------------
       /manifestdependency:"type='win32'
       name='Microsoft.VC90.DebugCRT'
       version='9.0.21022.8'
       processorArchitecture='x86'
       publicKeyToken='1fc8b3b9a1e18e3b'"
       /DEFAULTLIB:"msvcprtd"
       /manifestdependency:"type='win32'
       name='Microsoft.VC90.DebugCRT'
       version='9.0.21022.8'
       processorArchitecture='x86'
       publicKeyToken='1fc8b3b9a1e18e3b'"
       /DEFAULTLIB:"MSVCRTD"
       /DEFAULTLIB:"OLDNAMES"

可以看到，hello.obj须要链接libcpmt.lib、LIBCMT.lib和OLDNAMES.lib。当我们使用"/MDd"参数编译时，hello.obj就需要msvcprtd.lib、MSVCRTD.lib和OLDNAMES.lib，除此之外，编译器还给链接器传递了"/manifestdependency"参数，即manifest信息。

> **Q&A**
>
> **Q：**如果一个程序里面的不同obj文件或DLL文件使用了不同的CRT，会不会有问题？
>
> **A：**这个问题实际上分很多种情况。如果程序没有用到DLL，完全静态链接，不同的obj在编译时用到了不同版本的静态CRT。由于目前静态链接CRT只有多线程版，并且如果所有的目标文件都统一使用调试版或发布版，那么这种情况下一般是不会有问题的。因为我们知道，目标文件对静态库引用只是在目标文件的符号表中保留一个记号，并不进行实际的链接，也没有静态库的版本信息。
>
> 但是，如果程序涉及动态链接CRT，这就比较复杂了。因为不同的目标文件如果依赖于不同版本的msvcrt.lib和msvcrt.dll，甚至有些目标文件是依赖于静态CRT，而有些目标文件依赖于动态CRT，那么很有可能出现的问题就是无法通过链接。链接器对这种情况的具体反应依赖于输入目标文件的顺序，有些情况下它会报符号重复定义错误：
>
>     MSVCRTD.lib(MSVCR80D.dll) : error LNK2005: _printf already defined in LIBCMTD.lib (printf.obj)
>
> 但是有些情况下，它会使链接顺利通过，只是给出一个警告：
>
>     LINK : warning LNK4098: defaultlib 'LIBCMTD' conflicts with use of other libs; use /NODEFAULTLIB:library
>
> 如果碰到上面这种静态/动态CRT混合的情况，我们可以使用链接器的/NODEFAULTLIB来禁止某个或某些版本的CRT，这样一般就能使链接顺利进行。
>
> 最麻烦的情况应该属于一个程序所依赖的DLL分别使用不同的CRT，这会导致程序在运行时同时有多份CRT的副本。在一般情况下，这个程序应该能正常运行，但是值得注意的是，你不能够在这些DLL之间相互传递使用一些资源。比如两个DLL
> A和B分别使用不同的CRT，那么应该注意以下问题：
>
> - 不能在A中申请内存然后在B中释放，因为它们分属于不同的CRT，即拥有不同的堆，这包括C++里面所有对象的申请和释放；
> - 在A中打开的文件不能在B中使用，比如FILE\*之类的，因为它们依赖于CRT的文件操作部分。
>
> 还有类似的问题，比如不能相互共享locale等。如果不违反上述规则，可能会使程序发生莫名其妙的错误并且很难发现。
>
> 防止出现上述问题的最好方法就是保证一个工程里面所有的目标文件和DLL都使用同一个版本的CRT。当然有时候事实并不能尽如人意，比如很多时候当我们要用到第三方提供的.lib或DLL文件而对方又不提供源代码时，就会比较难办。
>
> Windows系统的system32目录下有个叫msvcrt.dll的文件，它跟msvcr90.dll这样的DLL有什么区别？
>
> **Q：**为什么我用Visual C++
> 2005/2008编译的程序无法在别人的机器上运行？
>
> **A：**因为Visual C++
> 2005/2008编译的程序使用了manifest机制，这些程序必须依赖于相对应版本的运行库。一个解决的方法就是使用静态链接，这样就不需要依赖于CRT的DLL。另外一个解决的方法就是将相应版本的运行库与程序一起发布给最终用户。
