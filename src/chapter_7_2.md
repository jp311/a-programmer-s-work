## 7.2 简单的动态链接例子

Windows平台下的PE动态链接机制与Linux下的ELF动态链接稍有不同，ELF比PE从结构上来看更加简单，我们先以ELF作为例子来描述动态链接的过程，接着我们将会单独描述Windows平台下PE动态链接机制的差异。

首先通过一个简单的例子来大致地感受一下动态链接，我们还是以图7-2中的Program1和Program2来做演示。我们分别需要如下几个源文件："Program1.c"、"Program2.c"、"Lib.c"和"Lib.h"。它们的源代码如清单7-1所示。

清单7-1 SimpleDynamicalLinking

    /* Program1.c */
    #include "Lib.h"

    int main()
    {   
        foobar(1);
        return 0;
    }

    /* Program2.c */
    #include "Lib.h"

    int main()
    {   
      foobar(2);
        return 0;
    }

    /* Lib.c */
    #include <stdio.h>

    void foobar(int i) 
    {
        printf("Printing from Lib.so %d\n", i);
    }

    /* Lib.h */
    #ifndef LIB_H
    #define LIB_H

    void foobar(int i);

    #endif

程序很简单，两个程序的主要模块Program1.c和Program2.c分别调用了Lib.c里面的foobar()函数，传进去一个数字，foobar()函数的作用就是打印这个数字。然后我们使用GCC将Lib.c编译成一个共享对象文件：

    gcc -fPIC -shared -o Lib.so Lib.c

> 上面GCC命令中的参数"-shared"表示产生共享对象，"-fPIC"我们稍后还会详细解释，这里暂且略过。

这时候我们得到了一个Lib.so文件，这就是包含了Lib.c的foobar()函数的共享对象文件。然后我们分别编译链接Program1.c和Program2.c：

    gcc -o Program1 Program1.c ./Lib.so
    gcc -o Program2 Program2.c ./Lib.so

这样我们得到了两个程序Program1和Program2，这两个程序都使用了Lib.so里面的foobar()函数。从Program1的角度看，整个编译和链接过程如图7-3所示。

![](../Images/7-3.jpg)\
图7-3 动态链接过程

Lib.c被编译成Lib.so共享对象文件，Program1.c被编译成Program1.o之后，链接成为可执行程序Program1。图7-3中有一个步骤与静态链接不一样，那就是Program1.o被连接成可执行文件的这一步。在静态链接中，这一步链接过程会把Program1.o和Lib.o链接到一起，并且产生输出可执行文件Program1。但是在这里，Lib.o没有被链接进来，链接的输入目标文件只有Program1.o（当然还有C语言运行库，我们这里暂时忽略）。但是从前面的命令行中我们看到，Lib.so也参与了链接过程。这是怎么回事呢？

> **关于模块（Module）**
>
> 在静态链接时，整个程序最终只有一个可执行文件，它是一个不可以分割的整体；但是在动态链接下，一个程序被分成了若干个文件，有程序的主要部分，即可执行文件（Program1）和程序所依赖的共享对象（Lib.so），很多时候我们也把这些部分称为模块，即动态链接下的可执行文件和共享对象都可以看作是程序的一个模块。

让我们再回到动态链接的机制上来，当程序模块Program1.c被编译成为Program1.o时，编译器还不不知道foobar()函数的地址，这个内容我们已在静态链接中解释过了。当链接器将Program1.o链接成可执行文件时，这时候链接器必须确定Program1.o中所引用的foobar()函数的性质。如果foobar()是一个定义与其他静态目标模块中的函数，那么链接器将会按照静态链接的规则，将Program1.o中的foobar地址引用重定位；如果foobar()是一个定义在某个动态共享对象中的函数，那么链接器就会将这个符号的引用标记为一个动态链接的符号，不对它进行地址重定位，把这个过程留到装载时再进行。

那么这里就有个问题，链接器如何知道foobar的引用是一个静态符号还是一个动态符号？这实际上就是我们要用到Lib.so的原因。Lib.so中保存了完整的符号信息（因为运行时进行动态链接还须使用符号信息），把Lib.so也作为链接的输入文件之一，链接器在解析符号时就可以知道：foobar是一个定义在Lib.so的动态符号。这样链接器就可以对foobar的引用做特殊的处理，使它成为一个对动态符号的引用。

### 动态链接程序运行时地址空间分布

对于静态链接的可执行文件来说，整个进程只有一个文件要被映射，那就是可执行文件本身，我们在前面的章节已经介绍了静态链接下的进程虚拟地址空间的分布。但是对于动态链接来说，除了可执行文件本身之外，还有它所依赖的共享目标文件。那么这种情况下，进程的地址空间分布又会怎样呢？

我们还是以上面的Program1为例，但是当我们试图运行Program1并且查看它的进程空间分布时，程序一运行就结束了。所以我们得对程序做适当的修改，在Lib.c中的foobar()函数里面加入sleep函数：

    #include <stdio.h>

    void foobar(int i)
    {
         printf("Printing from Lib.so %d\n", i);
         sleep(-1);
    }

然后就可以查看进程的虚拟地址空间分布：

    $./Program1 &
    [1] 12985
    Printing from Lib.so 1
    $ cat /proc/12985/maps
    08048000-08049000 r-xp 00000000 08:01 1343432    ./Program1
    08049000-0804a000 rwxp 00000000 08:01 1343432    ./Program1
    b7e83000-b7e84000 rwxp b7e83000 00:00 0
    b7e84000-b7fc8000 r-xp 00000000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fc8000-b7fc9000 r-xp 00143000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fc9000-b7fcb000 rwxp 00144000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fcb000-b7fce000 rwxp b7fcb000 00:00 0
    b7fd8000-b7fd9000 rwxp b7fd8000 00:00 0
    b7fd9000-b7fda000 r-xp 00000000 08:01 1343290    ./Lib.so
    b7fda000-b7fdb000 rwxp 00000000 08:01 1343290    ./Lib.so
    b7fdb000-b7fdd000 rwxp b7fdb000 00:00 0
    b7fdd000-b7ff7000 r-xp 00000000 08:01 1455332    /lib/ld-2.6.1.so
    b7ff7000-b7ff9000 rwxp 00019000 08:01 1455332    /lib/ld-2.6.1.so
    bf965000-bf97b000 rw-p bf965000 00:00 0          [stack]
    ffffe000-fffff000 r-xp 00000000 00:00 0          [vdso]
    $ kill 12985
    [1]+  Terminated              ./Program1

我们看到，整个进程虚拟地址空间中，多出了几个文件的映射。Lib.so与Program1一样，它们都是被操作系统用同样的方法映射至进程的虚拟地址空间，只是它们占据的虚拟地址和长度不同。Program1除了使用Lib.so以外，它还用到了动态链接形式的C语言运行库libc-2.6.1.so。另外还有一个很值得关注的共享对象就是ld-2.6.so，它实际上是Linux下的动态链接器。动态链接器与普通共享对象一样被映射到了进程的地址空间，在系统开始运行Program1之前，首先会把控制权交给动态链接器，由它完成所有的动态链接工作以后再把控制权交给Program1，然后开始执行。

我们通过readelf工具来查看Lib.so的装载属性，就如我们在前面查看普通程序一样：

    $ readelf -l Lib.so

    Elf file type is DYN (Shared object file)
    Entry point 0x390
    There are 4 program headers, starting at offset 52

    Program Headers:
      Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg Align
      LOAD        0x000000 0x00000000 0x00000000 0x004e0 0x004e0 R E 0x1000
      LOAD        0x0004e0 0x000014e0 0x000014e0 0x0010c 0x00110 RW  0x1000
      DYNAMIC     0x0004f4 0x000014f4 0x000014f4 0x000c8 0x000c8 RW  0x4
      GNU_STACK   0x000000 0x00000000 0x00000000 0x00000 0x00000 RW  0x4

     Section to Segment mapping:
      Segment Sections...
    00 .hash .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rel.dyn 
       .rel.plt .init .plt .text .fini 
    01 .ctors .dtors .jcr .dynamic .got .got.plt .data .bss
    02 .dynamic
    03

除了文件的类型与普通程序不同以外，其他几乎与普通程序一样。还有有一点比较不同的是，动态链接模块的装载地址是从地址0x00000000开始的。我们知道这个地址是无效地址，并且从上面的进程虚拟空间分布看到，Lib.so的最终装载地址并不是0x00000000，而是0xb7efc000。从这一点我们可以推断，共享对象的最终装载地址在编译时是不确定的，而是在装载时，装载器根据当前地址空间的空闲情况，动态分配一块足够大小的虚拟地址空间给相应的共享对象。

当然，这仅仅是一个推断，至于为什么要这样做，为什么不将每个共享对象在进程中的地址固定，或者在真正的系统中是怎么运作的，我们将在下一节进行解释。
