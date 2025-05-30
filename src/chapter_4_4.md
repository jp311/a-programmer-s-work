## 4.4 C++相关问题

C++的一些语言特性使之必须由编译器和链接器共同支持才能完成工作。最主要的有两个方面，一个是C++的重复代码消除，还有一个就是全局构造与析构。另外由于C++语言的各种特性，比如虚拟函数、函数重载、继承、异常等，使得它背后的数据结构异常复杂，这些数据结构往往在不同的编译器和链接器之间相互不能通用，使得C++程序的二进制兼容性成了一个很大的问题，我们在这一节还将讨论C++程序的二进制兼容性问题。

### 4.4.1 重复代码消除

C++编译器在很多时候会产生重复的代码，比如模板（Templates）、外部内联函数（Extern
Inline Function）和虚函数表（Virtual Function
Table）都有可能在不同的编译单元里生成相同的代码。最简单的情况就拿模板来说，模板从本质上来讲很像宏，当模板在一个编译单元里被实例化时，它并不知道自己是否在别的编译单元也被实例化了。所以当一个模板在多个编译单元同时实例化成相同的类型的时候，必然会生成重复的代码。当然，最简单的方案就是不管这些，将这些重复的代码都保留下来。不过这样做的主要问题有以下几方面。

- 空间浪费。可以想象一个有几百个编译单元的工程同时实例化了许多个模板，最后链接的时候必须将这些重复的代码消除掉，否则最终程序的大小肯定会膨胀得很厉害。
- 地址较易出错。有可能两个指向同一个函数的指针会不相等。
- 指令运行效率较低。因为现代的CPU都会对指令和数据进行缓存，如果同样一份指令有多份副本，那么指令Cache的命中率就会降低。

一个比较有效的做法就是将每个模板的实例代码都单独地存放在一个段里，每个段只包含一个模板实例。比如有个模板函数是add\<T\>()，某个编译单元以int类型和float类型实例化了该模板函数，那么该编译单元的目标文件中就包含了两个该模板实例的段。为了简单起见，我们假设这两个段的名字分别叫.temp.add\<int\>
和
.temp.add\<float\>。这样，当别的编译单元也以int或float类型实例化该模板函数后，也会生成同样的名字，这样链接器在最终链接的时候可以区分这些相同的模板实例段，然后将它们合并入最后的代码段。

这种做法的确被目前主流的编译器所采用，GNU GCC编译器和VISUAL
C++编译器都采用了类似的方法。GCC把这种类似的须要在最终链接时合并的段叫"Link
Once"，它的做法是将这种类型的段命名为".gnu.linkonce.name"，其中"name"是该模板函数实例的修饰后名称。VISUAL
C++编译器做法稍有不同，它把这种类型的段叫做"COMDAT"，这种"COMDAT"段的属性字段（PE文件的段表结构里面的IMAGE_SECTION_HEADER的Characteristics成员）都有IMAGE_SCN_LNK_COMDAT（0x00001000）这个标记，在链接器看到这个标记后，它就认为该段是COMDAT类型的，在链接时会将重复的段丢弃。

这种重复代码消除对于模板来说是这样的，对于外部内联函数和虚函数表的做法也类似。比如对于一个有虚函数的类来说，有一个与之相对应的虚函数表（Virtual
Function
Table，一般简称vtbl），编译器会在用到该类的多个编译单元生成虚函数表，造成代码重复；外部内联函数、默认构造函数、默认拷贝构造函数和赋值操作符也有类似的问题。它们的解决方式基本跟模板的重复代码消除类似。

这种方法虽然能够基本上解决代码重复的问题，但还是存在一些问题。比如相同名称的段可能拥有不同的内容，这可能由于不同的编译单元使用了不同的编译器版本或者编译优化选项，导致同一个函数编译出来的实际代码有所不同。那么这种情况下链接器可能会做出一个选择，那就是随意选择其中任何一个副本作为链接的输入，然后同时提供一个警告信息。

#### 函数级别链接

由于现在的程序和库通常来讲都非常庞大，一个目标文件可能包含成千上百个函数或变量。当我们须要用到某个目标文件中的任意一个函数或变量时，就须要把它整个地链接进来，也就是说那些没有用到的函数也被一起链接了进来。这样的后果是链接输出文件会变得很大，所有用到的没用到的变量和函数都一起塞到了输出文件中。

VISUAL C++编译器提供了一个编译选项叫函数级别链接（Functional-Level
Linking，/Gy），这个选项的作用就是让所有的函数都像前面模板函数一样，单独保存到一个段里面。当链接器须要用到某个函数时，它就将它合并到输出文件中，对于那些没有用的函数则将它们抛弃。这种做法可以很大程度上减小输出文件的长度，减少空间浪费。但是这个优化选项会减慢编译和链接过程，因为链接器须要计算各个函数之间的依赖关系，并且所有函数都保持到独立的段中，目标函数的段的数量大大增加，重定位过程也会因为段的数目的增加而变得复杂，目标文件随着段数目的增加也会变得相对较大。

GCC编译器也提供了类似的机制，它有两个选择分别是"-ffunction-sections"和"-fdata-sections"，这两个选项的作用就是将每个函数或变量分别保持到独立的段中。

### 4.4.2 全局构造与析构

我们知道一般的一个C/C++程序是从main开始执行的，随着main函数的结束而结束。然而，其实在main函数被调用之前，为了程序能够顺利执行，要先初始化进程执行环境，比如堆分配初始化（malloc、free）、线程子系统等，关于main之前所执行的部分，我们将在本书的第4部分详细介绍。C++的全局对象构造函数也是在这一时期被执行的，我们知道C++的全局对象的构造函数在main之前被执行，C++全局对象的析构函数在main之后被执行。

Linux系统下一般程序的入口是"\_start"，这个函数是Linux系统库（Glibc）的一部分。当我们的程序与Glibc库链接在一起形成最终可执行文件以后，这个函数就是程序的初始化部分的入口，程序初始化部分完成一系列初始化过程之后，会调用main函数来执行程序的主体。在main函数执行完成以后，返回到初始化部分，它进行一些清理工作，然后结束进程。对于有些场合，程序的一些特定的操作必须在main函数之前被执行，还有一些操作必须在main函数之后被执行，其中很具有代表性的就是C++的全局对象的构造和析构函数。因此ELF文件还定义了两种特殊的段。

- .init
  该段里面保存的是可执行指令，它构成了进程的初始化代码。因此，当一个程序开始运行时，在main函数被调用之前，Glibc的初始化部分安排执行这个段的中的代码。
- .fini
  该段保存着进程终止代码指令。因此，当一个程序的main函数正常退出时，Glibc会安排执行这个段中的代码。

这两个段.init和.fini的存在有着特别的目的，如果一个函数放到.init段，在main函数执行前系统就会执行它。同理，假如一个函数放到.fint段，在main函数返回后该函数就会被执行。利用这两个特性，C++的全局构造和析构函数就由此实现。我们将在第11章中作详细介绍。

### 4.4.3 C++与ABI

既然每个编译器都能将源代码编译成目标文件，那么有没有不同编译器编译出来的目标文件是不能够相互链接的呢？有没有可能将MSVC编译出来的目标文件和GCC编译出来的目标文件链接到一起，形成一个可执行文件呢？

对于上面这些问题，首先我们可以想到的是，如果要将两个不同编译器的编译结果链接到一起，那么，首先链接器必须支持这两个编译器产生的目标文件的格式。比如MSVC编译的目标文件是PE/COFF格式的，而GCC编译的结果是ELF格式的，链接器必须同时认识这两种格式才行，否则肯定没戏。那是不是链接器只要同时认识目标文件的格式就可以了呢？

事实并不像我们想象的那么简单，如果要使两个编译器编译出来的目标文件能够相互链接，那么这两个目标文件必须满足下面这些条件：采用同样的目标文件格式、拥有同样的符号修饰标准、变量的内存分布方式相同、函数的调用方式相同，等等。其中我们把符号修饰标准、变量内存布局、函数调用方式等这些跟可执行代码二进制兼容性相关的内容称为ABI（Application
Binary Interface）。

> **ABI & API**
>
> 很多时候我们会碰到API（Application Programming
> Interface）这个概念，它与ABI只有一字之差，而且非常类似，很多人经常将它们的概念搞混。那么它们之间有什么区别呢？实际上它们都是所谓的应用程序接口，只是它们所描述的接口所在的层面不一样。API往往是指源代码级别的接口，比如我们可以说POSIX是一个API标准、Windows所规定的应用程序接口是一个API；而ABI是指二进制层面的接口，ABI的兼容程度比API要更为严格，比如我们可以说C++的对象内存分布（Object
> Memory Layout）是C++
> ABI的一部分。API更关注源代码层面的，比如POSIX规定printf()这个函数的原型，它能保证这个函数定义在所有遵循POSIX标准的系统之间都是一样的，但是它不保证printf在实际的每个系统中执行时，是否按照从右到左将参数压入堆栈，参数在堆栈中如何分布等这些实际运行时的二进制级别的问题。比如有两台机器，一台是Intel
> x86，另外一台是MIPS的，它们都安装了Linux系统，由于Linux支持POSIX标准，所以它们的C运行库都应该有printf函数。但实际上printf在被调用过程中，这些关于参数和堆栈分布的细节在不同的机器上肯定是不一样的，甚至调用printf的指令也是不一样的（x86是call指令，MIPS是jal指令），这就是说，API相同并不表示ABI相同。
>
> ABI的概念其实从开始至今一直存在，因为人们总是希望程序能够在不经任何修改的情况下得到重用，最好的情况是二进制的指令和数据能够不加修改地得到重用。人们始终在朝这个方向努力，但是由于现实的因素，二进制级别的重用还是很难实现。最大的问题之一就是各种硬件平台、编程语言、编译器、链接器和操作系统之间的ABI相互不兼容，由于ABI的不兼容，各个目标文件之间无法相互链接，二进制兼容性更加无从谈起。

影响ABI的因素非常多，硬件、编程语言、编译器、链接器、操作系统等都会影响ABI。我们可以从C语言的角度来看一个编程语言是如何影响ABI的。对于C语言的目标代码来说，以下几个方面会决定目标文件之间是否二进制兼容：

- 内置类型（如int、float、char等）的大小和在存储器中的放置方式（大端、小端、对齐方式等）。
- 组合类型（如struct、union、数组等）的存储方式和内存分布。
- 外部符号（external-linkage）与用户定义的符号之间的命名方式和解析方式，如函数名func在C语言的目标文件中是否被解析成外部符号_func。
- 函数调用方式，比如参数入栈顺序、返回值如何保持等。
- 堆栈的分布方式，比如参数和局部变量在堆栈里的位置，参数传递方法等。
- 寄存器使用约定，函数调用时哪些寄存器可以修改，哪些须要保存，等等。

当然这只是一部分因素，还有其他因素我们在此不一一列举了。到了C++的时代，语言层面对ABI的影响又增加了很多额外的内容，可以看到，正是这些内容使C++要做到二进制兼容比C来得更为不易：

- 继承类体系的内存分布，如基类，虚基类在继承类中的位置等。
- 指向成员函数的指针（pointer-to-member）的内存分布，如何通过指向成员函数的指针来调用成员函数，如何传递this指针。
- 如何调用虚函数，vtable的内容和分布形式，vtable指针在object中的位置等。
- template如何实例化。
- 外部符号的修饰。
- 全局对象的构造和析构。
- 异常的产生和捕获机制。
- 标准库的细节问题，RTTI如何实现等。
- 内嵌函数访问细节。

C++一直为人诟病的一大原因是它的二进制兼容性不好，或者说比起C语言来更为不易。不仅不同的编译器编译的二进制代码之间无法相互兼容，有时候连同一个编译器的不同版本之间兼容性也不好。比如我有一个库A是公司Company
A用Compiler A编译的，我有另外一个库B是公司Company B用Compiler
B编译的，当我想写一个C++程序来同时使用库A和B将会很是棘手。有人说，那么我每次只要用同一个编译器编译所有的源代码就能解决问题了。不错，对于小型项目来说这个方法的确可行，但是考虑到一些大型的项目，以上的方法实际上并不可行。

很多时候，库厂商往往不希望库用户看到库的源代码，所以一般是以二进制的方式提供给用户。这样，当用户的编译器型号与版本与编译库所用的编译器型号和版本不同时，就可能产生不兼容。如果让库的厂商提供所有的编译器型号和版本编译出来的库给用户，这基本上不现实，特别是厂商对库已经停止了维护后，使用这样陈年老"库"实在是一件令人头痛的事。以上的情况对于系统中已经存在的静态库或动态库须要被多个应用程序使用的情况也几乎相同，或者一个程序由多个公司或多个部门一起开发，也有类似的问题。

所以人们一直期待着能有统一的C++二进制兼容标准（C++
ABI），诸多的团体和社区都在致力于C++
ABI标准的统一。但是目前情况还是不容乐观，基本形成以微软的VISUAL
C++和GNU阵营的GCC（采用Intel Itanium C++
ABI标准）为首的两大派系，各持己见互不兼容。早先时候，\*NIX系统下的ABI也十分混乱，这个情况一直延续到LSB（Linux
Standard Base）和Intel的Itanium C++
ABI标准出来后才有所改善，但并未彻底解决ABI的问题，由于现实的因素，这个问题还会长期地存在，这也是为什么有这么多像我们这样的程序员能够存在的原因。
