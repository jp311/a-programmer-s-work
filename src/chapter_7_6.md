## 7.6 动态链接的步骤和实现

有了前面诸多的铺垫，我们终于要开始分析动态链接的实际链接步骤了。动态链接的步骤基本上分为3步：先是启动动态链接器本身，然后装载所有需要的共享对象，最后是重定位和初始化。

### 7.6.1 动态链接器自举

我们知道动态链接器本身也是一个共享对象，但是事实上它有一些特殊性。对于普通共享对象文件来说，它的重定位工作由动态链接器来完成；它也可以依赖于其他共享对象，其中的被依赖的共享对象由动态链接器负责链接和装载。可是对于动态链接器本身来说，它的重定位工作由谁来完成？它是否可以依赖于其他的共享对象？

这是一个"鸡生蛋，蛋生鸡"的问题，为了解决这种无休止的循环，动态链接器这个"鸡"必须有些特殊性。首先是，动态链接器本身不可以依赖于其他任何共享对象；其次是动态链接器本身所需要的全局和静态变量的重定位工作由它本身完成。对于第一个条件我们可以人为地控制，在编写动态链接器时保证不使用任何系统库、运行库；对于第二个条件，动态链接器必须在启动时有一段非常精巧的代码可以完成这项艰巨的工作而同时又不能用到全局和静态变量。这种具有一定限制条件的启动代码往往被称为自举（Bootstrap）。

动态链接器入口地址即是自举代码的入口，当操作系统将进程控制权交给动态链接器时，动态链接器的自举代码即开始执行。自举代码首先会找到它自己的GOT。而GOT的第一个入口保存的即是".dynamic"段的偏移地址，由此找到了动态连接器本身的".dynamic"段。通过".dynamic"中的信息，自举代码便可以获得动态链接器本身的重定位表和符号表等，从而得到动态链接器本身的重定位入口，先将它们全部重定位。从这一步开始，动态链接器代码中才可以开始使用自己的全局变量和静态变量。

实际上在动态链接器的自举代码中，除了不可以使用全局变量和静态变量之外，甚至不能调用函数，即动态链接器本身的函数也不能调用。这是为什么呢？其实我们在前面分析地址无关代码时已经提到过，实际上使用PIC模式编译的共享对象，对于模块内部的函数调用也是采用跟模块外部函数调用一样的方式，即使用GOT/PLT的方式，所以在GOT/PLT没有被重定位之前，自举代码不可以使用任何全局变量，也不可以调用函数。下面这段注释来自于Glibc
2.6.1源代码中的elf/rtld.c：

      /* Now life is sane; we can call functions and access global data.
         Set up to use the operating system facilities, and find out from
         the operating system's program loader where to find the program
         header table in core.  Put the rest of _dl_start into a separate
         function, that way the compiler cannot put accesses to the GOT
         before ELF_DYNAMIC_RELOCATE.  */

这段注释写在自举代码的末尾，表示自举代码已经执行结束。"Now life is
sane"，可以想象动态链接器的作者在此时大舒一口气，终于完成自举了，可以自由地调用各种函数并且随意访问全局变量了。

### 7.6.2 装载共享对象

完成基本自举以后，动态链接器将可执行文件和链接器本身的符号表都合并到一个符号表当中，我们可以称它为全局符号表（Global
Symbol
Table）。然后链接器开始寻找可执行文件所依赖的共享对象，我们前面提到过".dynamic"段中，有一种类型的入口是DT_NEEDED，它所指出的是该可执行文件（或共享对象）所依赖的共享对象。由此，链接器可以列出可执行文件所需要的所有共享对象，并将这些共享对象的名字放入到一个装载集合中。然后链接器开始从集合里取一个所需要的共享对象的名字，找到相应的文件后打开该文件，读取相应的ELF文件头和".dynamic"段，然后将它相应的代码段和数据段映射到进程空间中。如果这个ELF共享对象还依赖于其他共享对象，那么将所依赖的共享对象的名字放到装载集合中。如此循环直到所有依赖的共享对象都被装载进来为止，当然链接器可以有不同的装载顺序，如果我们把依赖关系看作一个图的话，那么这个装载过程就是一个图的遍历过程，链接器可能会使用深度优先或者广度优先或者其他的顺序来遍历整个图，这取决于链接器，比较常见的算法一般都是广度优先的。

当一个新的共享对象被装载进来的时候，它的符号表会被合并到全局符号表中，所以当所有的共享对象都被装载进来的时候，全局符号表里面将包含进程中所有的动态链接所需要的符号。

#### 符号的优先级

在动态链接器按照各个模块之间的依赖关系，对它们进行装载并且将它们的符号并入到全局符号表时，会不会有这么一种情况发生，那就是有可能两个不同的模块定义了同一个符号？让我们来看看这样一个例子：共有4个共享对象a1.so、a2.so、b1.so和b2.so，它们的源代码文件分别为a1.c、a2.c、b1.c和b2.c：

    /* a1.c */
    #include <stdio.h>

    void a()
    {
        printf("a1.c\n");
    }

    /* a2.c */
    #include <stdio.h>

    void a()
    {
        printf("a2.c\n");
    }
    /* b1.c */
    void a();

    void b1()
    {
        a();
    }

    /* b2.c */
    void a();

    void b2()
    {
        a();
    }

可以看到a1.c和a2.c中都定义了名字为"a"的函数。那么由于b1.c和b2.c都用到了外部函数"a"，但由于源代码中没有指定依赖于哪个共享对象中的函数"a"，所以我们在编译时指定依赖关系。我们假设b1.so依赖于a1.so，b2.so依赖于a2.so，将b1.so与a1.so进行链接，b2.so与a2.so进行链接：

    $ gcc -fPIC -shared a1.c -o a1.so
    $ gcc -fPIC -shared a2.c -o a2.so
    $ gcc -fPIC -shared b1.c a1.so -o b1.so
    $ gcc -fPIC -shared b2.c a2.so -o b2.so
    $ ldd b1.so
            linux-gate.so.1 =>  (0xffffe000)
            a1.so => not found
            libc.so.6 => /lib/tls/i686/cmov/libc.so.6 (0xb7e86000)
            /lib/ld-linux.so.2 (0x80000000)
    $ldd b2.so
            linux-gate.so.1 =>  (0xffffe000)
            a2.so => not found
            libc.so.6 => /lib/tls/i686/cmov/libc.so.6 (0xb7e17000)
            /lib/ld-linux.so.2 (0x80000000)

那么当有程序同时使用b1.c中的函数b1和b2.c中的函数b2会怎么样呢？比如有程序main.c：

    /* main.c */
    #include <stdio.h>

    void b1();
    void b2();

    int main()
    {
        b1();
        b2();
        return 0;
    }

然后我们将main.c编译成可执行文件并且运行：

    $gcc main.c b1.so b2.so -o main -Xlinker -rpath ./
    ./main
    a1.c
    a1.c

> "-XLinker -rpath
> ./"表示链接器在当前路径寻找共享对象，否则链接器会报无法找到a1.so和a2.so错误

很明显，main依赖于b1.so和b2.so；b1.so依赖于a1.so；b2.so依赖于a2.so，所以当动态链接器对main程序进行动态链接时，b1.so、b2.so、a1.so和a2.so都会被装载到进程的地址空间，并且它们中的符号都会被并入到全局符号表，通过查看进程的地址空间信息可看到：

    $ cat /proc/14831/maps
    08048000-08049000 r-xp 00000000 08:01 1344643    ./main
    08049000-0804a000 rwxp 00000000 08:01 1344643    ./main
    b7e83000-b7e84000 rwxp b7e83000 00:00 0
    b7e84000-b7e85000 r-xp 00000000 08:01 1343481    ./a2.so
    b7e85000-b7e86000 rwxp 00000000 08:01 1343481    ./a2.so
    b7e86000-b7e87000 r-xp 00000000 08:01 1343328    ./a1.so
    b7e87000-b7e88000 rwxp 00000000 08:01 1343328    ./a1.so
    b7e88000-b7fcc000 r-xp 00000000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fcc000-b7fcd000 r-xp 00143000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fcd000-b7fcf000 rwxp 00144000 08:01 1488993    /lib/tls/i686/cmov/libc-2.6.1.so
    b7fcf000-b7fd3000 rwxp b7fcf000 00:00 0
    b7fde000-b7fdf000 r-xp 00000000 08:01 1344641    ./b2.so
    b7fdf000-b7fe0000 rwxp 00000000 08:01 1344641    ./b2.so
    b7fe0000-b7fe1000 r-xp 00000000 08:01 1344637    ./b1.so
    b7fe1000-b7fe2000 rwxp 00000000 08:01 1344637    ./b1.so
    b7fe2000-b7fe4000 rwxp b7fe2000 00:00 0
    b7fe4000-b7ffe000 r-xp 00000000 08:01 1455332    /lib/ld-2.6.1.so
    b7ffe000-b8000000 rwxp 00019000 08:01 1455332    /lib/ld-2.6.1.so
    bfdd2000-bfde7000 rw-p bfdd2000 00:00 0          [stack]
    ffffe000-fffff000 r-xp 00000000 00:00 0          [vdso]

这4个共享对象的确都被装载进来了，那a1.so中的函数a和a2.so中的函数a是不是冲突了呢？为什么main的输出结果是两个"a1.c"呢？也就是说a2.so中的函数a似乎被忽略了。这种一个共享对象里面的全局符号被另一个共享对象的同名全局符号覆盖的现象又被称为共享对象全局符号介入（Global
Symbol Interpose）。

关于全局符号介入这个问题，实际上Linux下的动态链接器是这样处理的：它定义了一个规则，那就是当一个符号需要被加入全局符号表时，如果相同的符号名已经存在，则后加入的符号被忽略。从动态链接器的装载顺序可以看到，它是按照广度优先的顺序进行装载的，首先是main，然后是b1.so、b2.so、a1.so，最后是a2.so。当a2.so中的函数a要被加入全局符号表时，先前装载a1.so时，a1.so中的函数a已经存在于全局符号表，那么a2.so中的函数a只能被忽略。所以整个进程中，所有对于符合"a"的引用都会被解析到a1.so中的函数a，这也是为什么main打印出的结果是两个"a1.c"而不是理想中的"a1.c"和"a2.c"。

由于存在这种重名符号被直接忽略的问题，当程序使用大量共享对象时应该非常小心符号的重名问题，如果两个符号重名又执行不同的功能，那么程序运行时可能会将所有该符号名的引用解析到第一个被加入全局符号表的使用该符号名的符号，从而导致程序莫名其妙的错误。

#### 全局符号介入与地址无关代码

前面介绍地址无关代码时，对于第一类模块内部调用或跳转的处理时，我们简单地将其当作是相对地址调用/跳转。但实际上这个问题比想象中要复杂，结合全局符号介入，关于调用方式的分类的解释会更加清楚。还是拿前面"pic.c"的例子来看，由于可能存在全局符号介入的问题，foo函数对于bar的调用不能够采用第一类模块内部调用的方法，因为一旦bar函数由于全局符号介入被其他模块中的同名函数覆盖，那么foo如果采用相对地址调用的话，那个相对地址部分就需要重定位，这又与共享对象的地址无关性矛盾。所以对于bar()函数的调用，编译器只能采用第三种，即当作模块外部符号处理，bar()函数被覆盖，动态链接器只需要重定位".got.plt"，不影响共享对象的代码段。

为了提高模块内部函数调用的效率，有一个办法是把bar()函数变成编译单元私有函数，即使用"static"关键字定义bar()函数，这种情况下，编译器要确定bar()函数不被其他模块覆盖，就可以使用第一类的方法，即模块内部调用指令，可以加快函数的调用速度。

### 7.6.3 重定位和初始化

当上面的步骤完成之后，链接器开始重新遍历可执行文件和每个共享对象的重定位表，将它们的GOT/PLT中的每个需要重定位的位置进行修正。因为此时动态链接器已经拥有了进程的全局符号表，所以这个修正过程也显得比较容易，跟我们前面提到的地址重定位的原理基本相同。在前面介绍动态链接下的重定位表时，我们已经碰到过几种重定位类型，每种重定位入口地址的计算方式我们在这里就不再重复介绍了。

重定位完成之后，如果某个共享对象有".init"段，那么动态链接器会执行".init"段中的代码，用以实现共享对象特有的初始化过程，比如最常见的，共享对象中的C++的全局/静态对象的构造就需要通过".init"来初始化。相应地，共享对象中还可能有".finit"段，当进程退出时会执行".finit"段中的代码，可以用来实现类似C++全局对象析构之类的操作。

如果进程的可执行文件也有".init"段，那么动态链接器不会执行它，因为可执行文件中的".init"段和".finit"段由程序初始化部分代码负责执行，我们将在后面的"库"这一部分详细介绍程序初始化部分。

当完成了重定位和初始化之后，所有的准备工作就宣告完成了，所需要的共享对象也都已经装载并且链接完成了，这时候动态链接器就如释重负，将进程的控制权转交给程序的入口并且开始执行。

### 7.6.4 Linux动态链接器实现

在前面分析Linux下程序的装载时，已经介绍了一个通过execve()系统调用被装载到进程的地址空间的程序，以及内核如何处理可执行文件。内核在装载完ELF可执行文件以后就返回到用户空间，将控制权交给程序的入口。对于不同链接形式的ELF可执行文件，这个程序的入口是有区别的。对于静态链接的可执行文件来说，程序的入口就是ELF文件头里面的e_entry指定的入口；对于动态链接的可执行文件来说，如果这时候把控制权交给e_entry指定的入口地址，那么肯定是不行的，因为可执行文件所依赖的共享库还没有被装载，也没有进行动态链接。所以对于动态链接的可执行文件，内核会分析它的动态链接器地址（在".interp"段），将动态链接器映射至进程地址空间，然后把控制权交给动态链接器。

Linux动态链接器是个很有意思的东西，它本身是一个共享对象，它的路径是/lib/ld-linux.so.2，这实际上是个软链接，它指向/lib/ld-x.y.z.so，这个才是真正的动态连接器文件。共享对象其实也是ELF文件，它也有跟可执行文件一样的ELF文件头（包括e_entry、段表等）。动态链接器是个非常特殊的共享对象，它不仅是个共享对象，还是个可执行的程序，可以直接在命令行下面运行：

    $ /lib/ld-linux.so.2
    Usage: ld.so [OPTION]... EXECUTABLE-FILE [ARGS-FOR-PROGRAM...]
    You have invoked `ld.so', the helper program for shared library executables.
    This program usually lives in the file `/lib/ld.so', and special directives
    in executable files using ELF shared libraries tell the system's program
    loader to load the helper program from this file.  This helper program loads
    the shared libraries needed by the program executable, prepares the program
    to run, and runs it.  You may invoke this helper program directly from the
    command line to load and run an ELF executable file; this is like executing
    that file itself, but always uses this helper program from the file you
    specified, instead of the helper program file specified in the executable
    file you run.  This is mostly of use for maintainers to test new versions
    of this helper program; chances are you did not intend to run this program.

      --list                list all dependencies and how they are resolved
      --verify            verify that given object really is a dynamically 
                            linked object we can handle
      --library-path PATH   use given PATH instead of content of the environment
                          variable LD_LIBRARY_PATH
      --inhibit-rpath LIST  ignore RUNPATH and RPATH information in object names
                            in LIST

其实Linux的内核在执行execve()时不关心目标ELF文件是否可执行（文件头e_type是ET_EXEC还是ET_DYN），它只是简单按照程序头表里面的描述对文件进行装载然后把控制权转交给ELF入口地址（没有".interp"就是ELF文件的e_entry；如果有".interp"的话就是动态链接器的e_entry）。这样我们就很好理解为什么动态链接器本身可以作为可执行程序运行，这也从一个侧面证明了共享库和可执行文件实际上没什么区别，除了文件头的标志位和扩展名有所不同之外，其他都是一样的。Windows系统中的EXE和DLL也是类似的区别，DLL也可以被当作程序来运行，Windows提供了一个叫做rundll32.exe的工具可以把一个DLL当作可执行文件运行。

Linux的ELF动态链接器是Glibc的一部分，它的源代码位于Glibc的源代码的elf目录下面，它的实际入口地址位于sysdeps/i386/dl-manchine.h中的_start（普通程序的入口地址_start()在sysdeps/i386/elf/start.S，本书的第4部分还会详细分析）。

\_start调用位于elf/rtld.c的_dl_start()函数。\_dl_start()函数首先对ld.so（以下简称ld-x.y.z.so为ld.so）进行重定位，因为ld.so自己就是动态链接器，没有人帮它做重定位工作，所以它只好自己来，美其名曰"自举"。自举的过程需要十分的小心谨慎，因为有很多限制，这个我们在前面已经介绍过了。完成自举之后就可以调用其他函数并访问全局变量了。调用_dl_start_final，收集一些基本的运行数值，进入_dl_sysdep_start，这个函数进行一些平台相关的处理之后就进入了_dl_main，这就是真正意义上的动态链接器的主函数了。\_dl_main在一开始会进行一个判断：

     if (*user_entry == (ElfW(Addr)) ENTRY_POINT)
        {
          /* Ho ho.  We are not the program interpreter!  We are the program
         itself!  This means someone ran ld.so as a command.  Well, that
         might be convenient to do sometimes.  We support it by
         interpreting the args like this:

         ld.so PROGRAM ARGS...

         The first argument is the name of a file containing an ELF
         executable we will load and run with the following arguments.
         To simplify life here, PROGRAM is searched for using the
         normal rules for shared objects, rather than $PATH or anything
         like that.  We just load it and use its entry point; we don't
         pay attention to its PT_INTERP command (we are the interpreter
         ourselves).  This is an easy way to test a new ld.so before
         installing it.  */
    …

很明显，如果指定的用户入口地址是动态链接器本身，那么说明动态链接器是被当作可执行文件在执行。在这种情况下，动态链接器就会解析运行时的参数，并且进行相应的处理。\_dl_main本身非常的长，主要的工作就是前面提到的对程序所依赖的共享对象进行装载、符号解析和重定位，我们在这里就不再详细展开了，因为它的实现细节又是一个非常大的话题。

关于动态链接器本身的细节实现虽然不再展开，但是作为一个非常有特点的，也很特殊的共享对象，关于动态链接器的实现的几个问题还是很值得思考的：

1\. 动态链接器本身是动态链接的还是静态链接的？

:   动态链接器本身应该是静态链接的，它不能依赖于其他共享对象，动态链接器本身是用来帮助其他ELF文件解决共享对象依赖问题的，如果它也依赖于其他共享对象，那么谁来帮它解决依赖问题？所以它本身必须不依赖于其他共享对象。这一点可以使用ldd来判断：

        $ ldd /lib/ld-linux.so.2
                statically linked

2\. 动态链接器本身必须是PIC的吗？

:   是不是PIC对于动态链接器来说并不关键，动态链接器可以是PIC的也可以不是，但往往使用PIC会更加简单一些。一方面，如果不是PIC的话，会使得代码段无法共享，浪费内存；另一方面也会使ld.so本身初始化更加复杂，因为自举时还需要对代码段进行重定位。实际上的ld-linux.so.2是PIC的。

3\. 动态链接器可以被当作可执行文件运行，那么的装载地址应该是多少？

:   ld.so的装载地址跟一般的共享对象没区别，即为0x00000000。这个装载地址是一个无效的装载地址，作为一个共享库，内核在装载它时会为其选择一个合适的装载地址。
