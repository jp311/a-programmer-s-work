# 2.1 被隐藏了的过程

C语言的经典，“Hello World”程序几乎是每个程序员闭着眼睛都能写出的，编译运行通过一气呵成，基本成了程序入门和开发环境测试的默认的标准。

```c
#include <stdio.h>

int main()
{
    printf("Hello World\n");
    return 0;
}
```

在Linux下，当我们使用GCC来编译Hello World程序时，只须使用最简单的命令（假设源代码文件名为hello.c）：

```
$ gcc hello.c
$ ./a.out
Hello World
```

事实上，上述过程可以分解为4个步骤，分别是预处理（Prepressing）、编译（Compilation）、汇编（Assembly）和链接（Linking），如图2-1所示。

![图2-1 GCC编译过程分解](images/2-1.jpg)\
图2-1 GCC编译过程分解

## 2.1.1 预编译

首先是源代码文件hello.c和相关的头文件，如stdio.h等被预编译器cpp预编译成一个.i文件。对于C++程序来说，它的源代码文件的扩展名可能是.cpp或.cxx，头文件的扩展名可能是.hpp，而预编译后的文件扩展名是.ii。第一步预编译的过程相当于如下命令（-E表示只进行预编译）：

```
$ gcc -E hello.c -o hello.i
```

或者：

```
$ cpp hello.c > hello.i
```

预编译过程主要处理那些源代码文件中的以“#”开始的预编译指令。比如“#include”、“#define”等，主要处理规则如下：

- 将所有的“#define”删除，并且展开所有的宏定义。
- 处理所有条件预编译指令，比如“#if”、“#ifdef”、“#elif”、“#else”、“#endif”。
- 处理“#include”预编译指令，将被包含的文件插入到该预编译指令的位置。注意，这个过程是递归进行的，也就是说被包含的文件可能还包含其他文件。
- 删除所有的注释“//”和“/\* \*/”。
- 添加行号和文件名标识，比如#2 “hello.c” 2，以便于编译时编译器产生调试用的行号信息及用于编译时产生编译错误或警告时能够显示行号。
- 保留所有的#pragma编译器指令，因为编译器须要使用它们。

经过预编译后的.i文件不包含任何宏定义，因为所有的宏已经被展开，并且包含的文件也已经被插入到.i文件中。所以当我们无法判断宏定义是否正确或头文件包含是否正确时，可以查看预编译后的文件来确定问题。

## 2.1.2 编译

编译过程就是把预处理完的文件进行一系列词法分析、语法分析、语义分析及优化后生产相应的汇编代码文件，这个过程往往是我们所说的整个程序构建的核心部分，也是最复杂的部分之一。我们将在下一节简单介绍编译的具体几个步骤，这涉及编译原理等一些内容，由于它不是本书介绍的核心内容，所以也仅仅是介绍而已。上面的编译过程相当于如下命令：

```
$ gcc –S hello.i –o hello.s
```

现在版本的GCC把预编译和编译两个步骤合并成一个步骤，使用一个叫做cc1的程序来完成这两个步骤。这个程序位于“/usr/lib/gcc/i486-linux-gnu/4.1/”，我们也可以直接调用cc1来完成它：

```
$ /usr/lib/gcc/i486-linux-gnu/4.1/cc1 hello.c
 main
Execution times (seconds)
 preprocessing  :0.01(100%)usr  0.01(33%)sys  0.00( 0%)wall 77 kB( 8%)ggc
 lexical analysis :0.00( 0%)usr 0.00( 0%)sys  0.02(50%)wall 0 kB(0%)ggc
 parser         :0.00( 0%)usr 0.00( 0%)sys  0.01(25%)wall 125 kB(13%)ggc
 expand         :0.00( 0%)usr 0.01(33%)sys  0.00( 0%)wall 6 kB(1%)ggc
 TOTAL            :0.01         0.03        0.04          982 kB
```

或者使用如下命令：

```
$ gcc –S hello.c –o hello.s
```

都可以得到汇编输出文件hello.s。对于C语言的代码来说，这个预编译和编译的程序是cc1，对于C++来说，有对应的程序叫做cc1plus；Objective-C是cc1obj；fortran是f771；Java是jc1。所以实际上gcc这个命令只是这些后台程序的包装，它会根据不同的参数要求去调用预编译编译程序cc1、汇编器as、链接器ld。

## 2.1.3 汇编

汇编器是将汇编代码转变成机器可以执行的指令，每一个汇编语句几乎都对应一条机器指令。所以汇编器的汇编过程相对于编译器来讲比较简单，它没有复杂的语法，也没有语义，也不需要做指令优化，只是根据汇编指令和机器指令的对照表一一翻译就可以了，"汇编"这个名字也来源于此。上面的汇编过程我们可以调用汇编器as来完成：

```
$ as hello.s –o hello.o
```

或者：

```
$ gcc hello.s –o hello.o
```

或者使用gcc命令从C源代码文件开始，经过预编译、编译和汇编直接输出目标文件（Object File）：

```
$ gcc –c hello.c –o hello.o
```

## 2.1.4 链接

链接通常是一个让人比较费解的过程，为什么汇编器不直接输出可执行文件而是输出一个目标文件呢？链接过程到底包含了什么内容？为什么要链接？这恐怕是很多读者心中的疑惑。正是因为这些疑惑总是挥之不去，所以我们特意用这一章的篇幅来分析链接，具体地说分析静态链接的章节。下面让我们来看看怎么样调用ld才可以产生一个能够正常运行的HelloWorld程序：

```
$ ld -static /usr/lib/crt1.o /usr/lib/crti.o /usr/lib/gcc/i486-linux-gnu/4.1.3/crtbeginT.o -L/usr/lib/gcc/i486-linux-gnu/4.1.3 -L/usr/lib -L/lib hello.o --start-group -lgcc -lgcc_eh -lc --end-group /usr/lib/gcc/i486-linux-gnu/4.1.3/crtend.o /usr/lib/crtn.o
```

如果把所有的路径都省略掉，那么上面的命令就是：

```
ld -static crt1.o crti.o crtbeginT.o hello.o --start-group -lgcc -lgcc_eh -lc --end-group crtend.o crtn.o
```

可以看到，我们需要将一大堆文件链接起来才可以得到"a.out"，即最终的可执行文件。看了这行复杂的命令，可能很多读者的疑惑更多了，crt1.o、crti.o、crtbeginT.o、crtend.o、crtn.o这些文件是什么？它们做什么用的？-lgcc -lgcc_eh -lc这些都是什么参数？为什么要使用它们？为什么要将它们和hello.o链接起来才可以得到可执行文件？等等。

这些问题正是本书所需要介绍的内容，它们看似简单，其实涉及了编译、链接和库，甚至是操作系统的一些很底层的内容。我们将紧紧围绕着这些内容，进行必要的分析。不过在分析这些内容之前，我们还是来关注一下上面这些过程中，编译器担任了一个什么样的角色。
