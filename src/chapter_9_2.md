## 9.2 符号导出导入表

### 9.2.1 导出表

当一个PE需要将一些函数或变量提供给其他PE文件使用时，我们把这种行为叫做符号导出（Symbol
Exporting），最典型的情况就是一个DLL将符号导出给EXE文件使用。在前面介绍ELF动态连接时，我们已经接触过了符号导出的概念，ELF将导出的符号保存在".dynsym"段中，供动态链接器查找和使用。在Windows
PE中，符号导出的概念也是类似，所有导出的符号被集中存放在了被称作导出表（Export
Table）的结构中。事实上导出表从最简单的结构上来看，它提供了一个符号名与符号地址的映射关系，即可以通过某个符号查找相应的地址。基本上这些每个符号都是一个ASCII字符串，我们知道符号名可能跟相应的函数名或者变量名相同，也可能不同，因为有符号修饰这个机制存在。

> **注意**
>
> 很多时候，在讨论到PE的导入导出时，经常把函数和符号混淆在一起，因为PE在绝大部分时候只导入导出函数，而很少导入导出变量，所以类似于导出符号和导出函数这种叫法很多时候可以相互替换使用。

我们在前面介绍过，PE文件头中有一个叫做DataDirectory的结构数组，这个数组共有16个元素，每个元素中保存的是一个地址和一个长度。其中第一个元素就是导出表的结构的地址和长度。导出表是一个IMAGE_EXPORT_DIRECTORY的结构体，它被定义在"Winnt.h"中：

    typedef struct _IMAGE_EXPORT_DIRECTORY {
        DWORD   Characteristics;
        DWORD   TimeDateStamp;
        WORD    MajorVersion;
        WORD    MinorVersion;
        DWORD   Name;
        DWORD   Base;
        DWORD   NumberOfFunctions;
        DWORD   NumberOfNames;
        DWORD   AddressOfFunctions;     // RVA from base of image
        DWORD   AddressOfNames;          // RVA from base of image
        DWORD   AddressOfNameOrdinals;  // RVA from base of image
    } IMAGE_EXPORT_DIRECTORY

导出表结构中，最后的3个成员指向的是3个数组，这3个数组是导出表中最重要的结构，它们是导出地址表（EAT,
Export Address Table）、符号名表（Name
Table）和名字序号对应表（Name-Ordinal
Table）。对于"Math.dll"来说，这个导出表的结构将会如图9-2所示。

![](../Images/9-2.jpg)\
图9-2 Math.dll导出表结构

这3个数组中，前两个比较好理解。第一个叫做导出地址表EAT，它存放的是各个导出函数的RVA，比如第一项是0x1000，它是Add函数的RVA；第二个表是函数名表，它保存的是导出函数的名字，这个表中，所有的函数名是按照ASCII顺序排序的，以便于动态链接器在查找函数名字时可以速度更快（可以使用二分法查找），那么函数名表和EAT之间有什么关系呢？是不是一一对应呢？在上面的例子中似乎是这样的，比如Add对应0x1000，Mul对应0x1020，Sub对应0x1010，这样看起来很简单，但实际上并非如此，因为还有一个叫做序号的概念夹在这两个表之间；第三个名字序号对应表就有点另类了，导出一个函数除了函数名和函数地址不就够了吗？为什么要有序号？什么是序号？

#### 序号（Ordinals）

这还得从很早以前说起，早期的Windows是16位的，当时的16位Windows没有很好的虚拟内存机制，而且当时的硬件条件也不好，内存一般只有几个MB。而函数名表对于当时的Windows来说，其实是很奢侈的。比如一个user.dll有600多个导出函数，如果把这些函数的函数名表全部放在内存中的话，将会消耗几十KB的空间。除了user.dll之外，程序还会用到其他DLL，对于内存空间以KB计的年代来说，这是不可以容忍的。于是当时DLL的函数导出的主要方式是序号（Ordinals）。其实序号的概念很简单，一个导出函数的序号就是函数在EAT中的地址下标加上一个Base值（也就是IMAGE_EXPORT_DIRECTORY中的Base，默认情况下它的值是1）。比如上面的例子中，Mul的RVA为0x1020，它在EAT中的下标是1，加上一个Base值1，Mul的导出序号为2。如果一个模块A导入了Math.dll中的Add，那么它在导入表中将不保存"Add"这个函数名，而是保存Add函数的序号，即1。当动态链接器进行链接时，它只需要根据模块A的导入表中保存的序号1，减去Math.dll的Base值，得到下标0，然后就可以直接在Math.dll的EAT中找到Add函数的RVA。

使用序号导入导出的好处是明显的，那就是省去了函数名查找过程，函数名表也不需要保存在内存中了。那么使用序号导入导出的问题是什么？最大的问题是，一个函数的序号可能会变化。假设某一次更新中，Math.dll里面添加了一个函数或者删除了一个函数，那么原先函数的序号可能会因此发生变化，从而导致已有的应用程序运行出现问题。一种解决的方案是，由程序员手工指定每个导出函数的序号，比如我们指定Add的导出序号为1，Mul为2，Sub为3，以后加入函数则指定一个与其他函数不同的唯一的序号，如果删除一个函数，那么保持现有函数的序号不变。这种手工指定函数导出序号的方法可以通过链接器的.def文件实现，我们在后面关于DLL优化的章节中还会再详细介绍。

由程序员手工维护导出序号的方法在实际操作中颇为麻烦，为了节省那么一点点内存空间和并不明显的查找速度的提升（相对于现在的硬件条件），实在得不偿失。于是现在的DLL基本都不采用序号作为导入导出的手段，而是直接使用符号名。这种手段就显得直观多了，更加便于理解和程序调试（试想在调试DLL时看到一个导入函数是序号1或者是Add哪个更容易理解？），而且它不需要额外的手工维护，省去了很多繁琐的工作。

虽然现在的DLL导出方式基本都是使用符号名，但是实际上序号的导出方式仍然没有被抛弃。为了保持向后兼容性，序号导出方式仍然被保留，相反，符号名作为导出方式是可选的。一个DLL中的每一个导出函数都有一个对应唯一的序号值，而导出函数名却是可选的，也就是说一个导出函数肯定有一个序号值（序号值是肯定有的，因为函数在EAT的下标加上Base就是序号值），但是可以没有函数名。

了解了序号的概念之后，我们又回到了原来的那个问题，函数名和函数地址之间的关系是怎样的呢？符号名表和EAT的元素之间的映射关系又是怎样的？

上面问题的答案必须通过第三个表，即名字序号对应表。这个表拥有与函数名表一样多数目的元素，每个元素就是对应的函数名表中的函数名所对应的序号值，比如Add的序号值是1，Mul的序号值是2等。实际上它就是一个函数名与序号的对应关系表。

那么使用函数名作为导入导出方式，动态链接器如何查找函数的RVA呢？假设模块A导入了Math.dll中的Add函数，那么A的导入表中就保存了"Add"这个函数名。当进行动态链接时，动态链接器在Math.dll的函数名表中进行二分查找，找到"Add"函数，然后在名字序号对应表中找到"Add"所对应的序号，即1，减去Math.dll的Base值1，结果为0，然后在EAT中找到下标0的元素，即"Add"的RVA为0x1000。

从上面的Math.dll来看，3个表的结构都非常规则，元素数目相等，而且是一一对应的。但实际上这3个表的内容有可能变得不是很规则：假设我们在Math.dll中添加了一个函数叫做Div，它的RVA为0x1030，并且将它的序号值指定为5。为了保持原来的几个导出函数的序号值不变，我们手工指定原来的3个导出函数的序号值分别为Add
= 1，Mul = 2，Sub = 3。那么Math.dll的3个表的内容将如图9-3所示。

![](../Images/9-3.jpg)\
图9-3 Math.dll导出表结构（带序号）

对于链接器来说，它在链接输出DLL时需要知道哪些函数和变量是要被导出的，因为对于PE来说，默认情况下，全局函数和变量是不导出的。link链接器提供了了一个"/EXPORT"的参数可以指定导出符号，比如：

    link math.obj /DLL /EXPORT:_Add

就表示在产生math.dll时导出符号_Add。另外一种导出符号的方法是使用MSVC的\_\_declspec(dllexport)扩展，它实际上是通过目标文件的编译器指示来实现的（还记得前面关于PE/COFF目标文件的".drectve"段的描述吗？）。对于前面例子中的math.obj来说，它实际上在".drectve"段中保存了4个"/EXPORT"参数，用于传递给链接器，告知链接器导出相应的函数：

    dumpbin /DIRECTIVES math.obj
    Microsoft (R) COFF/PE Dumper Version 9.00.21022.08
    Copyright (C) Microsoft Corporation.  All rights reserved.


    Dump of file math.obj

    File Type: COFF OBJECT

       Linker Directives
       -----------------
       /DEFAULTLIB:"LIBCMT"
       /DEFAULTLIB:"OLDNAMES"
       /EXPORT:_Add
       /EXPORT:_Sub
       /EXPORT:_Mul
       /EXPORT:_Div

### 9.2.2 EXP文件

在创建DLL的同时也会得到一个EXP文件，这个文件实际上是链接器在创建DLL时的临时文件。链接器在创建DLL时与静态链接时一样采用两遍扫描过程，DLL一般都有导出符号，链接器在第一遍时会遍历所有的目标文件并且收集所有导出符号信息并且创建DLL的导出表。为了方便起见，链接器把这个导出表放到一个临时的目标文件叫做".edata"的段中，这个目标文件就是EXP文件，EXP文件实际上是一个标准的PE/COFF目标文件，只不过它的扩展名不是.obj而是.exp。在第二遍时，链接器就把这个EXP文件当作普通目标文件一样，与其他输入的目标文件链接在一起并且输出DLL。这时候EXP文件中的".edata"段也就会被输出到DLL文件中并且成为导出表。不过一般现在链接器很少会在DLL中单独保留".edata"段，而是把它合并到只读数据段".rdata"中。

### 9.2.3 导出重定向

DLL有一个很有意思的机制叫做导出重定向（Export
Forwarding），顾名思义就是将某个导出符号重定向到另外一个DLL。比如在Windows
XP系统中，KERNEL32.DLL中的HeapAlloc函数被重新定向到了NTDLL.DLL中的RtlAllocHeap函数，调用HeapAlloc函数相当于调用RtlAllocHeap函数。如果我们要重新定向某个函数，可以使用模块定义文件，比如HeapAlloc的重定向可以定义下面这样一个".DEF"文件：

    EXPORTS

    HeapAlloc = NTDLL.RtlAllocHeap

导出重定向的实现机制也很简单，正常情况下，导出表的地址数组中包含的是函数的RVA，但是如果这个RVA指向的位置位于导出表中（我们可以得到导出表的起始RVA和大小），那么表示这个符号被重定向了。被重定向了的符号的RVA并不代表该函数的地址，而是指向一个ASCII的字符串，这个字符串在导出表中，它是符号重定向后的DLL文件名和符号名。比如在这个例子中，这个字符串就是"NTDLL.RtlAllocHeap"。

### 9.2.4 导入表

如果我们在某个程序中使用到了来自DLL的函数或者变量，那么我们就把这种行为叫做符号导入（Symbol
Importing）。在ELF中,".rel.dyn"和".rel.plt"两个段中分别保存了该模块所需要导入的变量和函数的符号以及所在的模块等信息，而".got"和".got.plt"则保存着这些变量和函数的真正地址。Windows中也有类似的机制，它的名称更为直接，叫做导入表（Import
Table）。当某个PE文件被加载时，Windows加载器的其中一个任务就是将所有需要导入的函数地址确定并且将导入表中的元素调整到正确的地址，以实现动态链接的过程。

我们可以使用dumpbin来查看一个模块依赖于哪些DLL，又导入了哪些函数：

    dumpbin /IMPORTS Math.dll
    Microsoft (R) COFF/PE Dumper Version 9.00.21022.08
    Copyright (C) Microsoft Corporation.  All rights reserved.


    Dump of file Math.dll

    File Type: DLL

      Section contains the following imports:

        KERNEL32.dll
                  1000B000 Import Address Table
                  1000C5BC Import Name Table
                      0 time date stamp
                      0 Index of first forwarder reference

                      146 GetCurrentThreadId
                      110 GetCommandLineA
                      216 HeapFree
                      1E9 GetVersionExA
                      210 HeapAlloc
                      1A3 GetProcessHeap
                      1A0 GetProcAddress
                      17F GetModuleHandleA
                       B9 ExitProcess
                      365 TlsGetValue
                      363 TlsAlloc
                      366 TlsSetValue
                      364 TlsFree
                      22C InterlockedIncrement
                      328 SetLastError
                      171 GetLastError
                      228 InterlockedDecrement
                      356 Sleep
                      324 SetHandleCount

可以看到Math.dll从Kernel32.dll中导入了诸如GetCurrentThreadId、GetCommandLineA等函数（大约有数十个，这里省略了一部分）。可能你会觉得很奇怪，明明我们在Math.c里面没有用到这些函数，怎么会出现在导入列表之中？这是由于我们在构建Windows
DLL时，还链接了支持DLL运行的基本运行库，这个基本运行库需要用到Kernel32.dll，所以就有了这些导入函数。

在Windows中，系统的装载器会确保任何一个模块的依赖条件都得到满足，即每个PE文件所依赖的文件都将被装载。比如一般Windows程序都会依赖于KERNEL32.DLL，而KERNEL32.DLL又会导入NTDLL.DLL，即依赖于NTDLL.DLL，那么Windows在加载该程序时确保这两个DLL都被加载。如果程序用到了Windows
GDI，那么就会需要从GDI32.DLL中导入函数，而GDI32.DLL又依赖于USER32.DLL、ADVAPI32.DLL、NTDLL.DLL和KERNEL32.DLL，Windows将会保证这些依赖关系的正确，并且保证所有的导入符号都被正确地解析。在这个动态链接过程中，如果某个被依赖的模块无法正确加载，那么系统将会提示错误（我们经常会看到那种"缺少某个DLL"之类的错误），并且终止运行该进程。

在PE文件中，导入表是一个IMAGE_IMPORT_DESCRIPTOR的结构体数组，每一个IMAGE_IMPORT_DESCRIPTOR结构对应一个被导入的DLL。这个结构体被定义在"Winnt.h"中：

    typedef struct {
        DWORD   OriginalFirstThunk; 
        DWORD   TimeDateStamp;
        DWORD   ForwarderChain;
        DWORD   Name;
        DWORD   FirstThunk;
    } IMAGE_IMPORT_DESCRIPTOR;

结构体中的FirstThunk指向一个导入地址数组（Import Address
Table），IAT是导入表中最重要的结构，IAT中每个元素对应一个被导入的符号，元素的值在不同的情况下有不同的含义。在动态链接器刚完成映射还没有开始重定位和符号解析时，IAT中的元素值表示相对应的导入符号的序号或者是符号名；当Windows的动态链接器在完成该模块的链接时，元素值会被动态链接器改写成该符号的真正地址，从这一点看，导入地址数组与ELF中的GOT非常类似。

那么我们如何判断导入地址数组的元素中包含的是导入符号的序号还是符号的名字？事实上我们可以看这个元素的最高位，对于32位的PE来说，如果最高位被置1，那么低31位值就是导入符号的序号值；如果没有，那么元素的值是指向一个叫做IMAGE_IMPORT_BY_NAME结构的RVA。IMAGE_IMPORT_BY_NAME是由一个WORD和一个字符串组成，那个WORD值表示"Hint"值，即导入符号最有可能的序号值，后面的字符串是符号名。当使用符号名导入时，动态链接器会先使用"Hint"值的提示去定位该符号在目标导出表中的位置，如果刚好是所需要的符号，那么就命中；如果没有命中，那么就按照正常的二分查找方式进行符号查找。

在IMAGE_IMPORT_DESCRIPTOR结构中，还有一个指针OriginalFirstThrunk指向一个数组叫做导入名称表（Import
Name
Table），简称INT。这个数组跟IAT一摸一样，里面的数值也一样。那么为什么要多保存一份IAT的副本呢？答案我们将在后面的DLL绑定中揭晓（见图9-4）。

![](../Images/9-4.jpg)\
图9-4 TestMath.exe导入表

Windows的动态链接器会在装载一个模块的时候，改写导入表中的IAT，这一点很像ELF中的.got。其区别是，PE的导入表一般是只读的，它往往位于".rdata"这样的段中。这样就产生了一个问题，对于一个只读的段，动态链接器是怎么改写它的呢？解决方法是这样的，对于Windows来说，由于它的动态链接器其实是Windows内核的一部分，所以它可以随心所欲地修改PE装载以后的任意一部分内容，包括内容和它的页面属性。Windows的做法是，在装载时，将导入表所在的位置的页面改成可读写的，一旦导入表的IAT被改写完毕，再将这些页面设回至只读属性。从某些角度来看，PE的做法比ELF要更加安全一些，因为ELF运行程序随意修改.got，而PE则不允许。

#### 延迟载入（Delayed Load）

Visual C++
6.0开始引入了一个叫做延迟载入的新功能，这个功能有点类似于隐式装载和显式装载的混合体。当你链接一个支持延迟载入的DLL时，链接器会产生与普通DLL导入非常类似的数据。但是操作系统会忽略这些数据。当延迟载入的API第一次被调用时，由链接器添加的特殊的桩代码就会启动，这个桩代码负责对DLL的装载工作。然后这个桩代码通过调用GetProcAddress来找到被调用API的地址。另外MSVC还做了一些额外的优化，使得接下来的对该DLL的调用速度与普通方式载入的DLL的速度相差无异。

### 9.2.5 导入函数的调用

接下来我们来看看Windows
PE对于导入函数是怎么调用的？\_\_declspec(dllimport)又有什么作用？

如果在PE的模块中需要调用一个导入函数，仿照ELF
GOT机制的一个办法就是使用一个间接调用指令，比如：

    CALL DWORD PTR [0x0040D11C]

我们在Windows下也入乡随俗，使用微软汇编器语法。如果你不熟悉微软汇编器语法也没多大关系，上面这条指令的意思是间接调用0x0040D11C这个地址中保存的地址，即从地址0x0040D11C开始取4个字节作为目标地址（DWORD
PTR表示4个字节的操作前缀），然后调用该目标地址。而0x0040D11C这个地址刚好是IAT中的某一项，即我们需要调用的外部函数在IAT中所对应的元素，比如TestMath.exe中，我们需要调用Math.dll中的Sub函数，那么0x0040D11C正好对应Sub导入函数在TestMath.exe的IAT中的位置。这个过程跟ELF通过GOT间接跳转十分类似，IAT相当于GOT（不考虑PLT的情况下）。

> **PE DLL的地址无关性**
>
> 如果ELF调用者本身所在的模块是地址无关的，那么通过GOT跳转之前，需要计算目标函数地址在GOT中的位置，然后再间接跳转，以实现地址无关，这个原理我们在前面已经很详细地分析过了。但是在这个现实方法中，我们可以看到，这个0x0040D11C是作为常量被写入在指令中。而且事实上，PE对导入函数调用的真正实现中，它的确是这么做的，由此我们可以得出结论，PE
> DLL的代码段并不是地址无关的。
>
> 那么PE是如何解决装载时模块在进程空间中地址冲突的问题的呢？事实上它使用了一种叫做重定基地址的方法，我们在后面将会详细介绍。

PE采用上面的这个方法实现导入函数的调用，但是与ELF一样存在一个问题：对于编译器来说，它无法判断一个函数是本模块内部的，还是从外部导入的。因为对于普通的模块内部函数调用来说，编译器产生的指令是这样的：

    CALL XXXXXXXX

> 因为PE没有类似ELF的共享对象有全局符号介入的问题，所以对于模块内部的全局函数调用，编译器产生的都是直接调用指令。

其中XXXXXXXX是模块内部的函数地址。这是一个直接调用指令，与上面的间接调用指令形式不同。所以为了使得编译器能够区分函数是从外部导入的还是模块内部定义的，MSVC引入了我们前面用过的扩展属性"\_\_declspec(dllimport)"，一旦一个函数被声明为"\_\_declspec(dllimport)"，那么编译器就知道它是外部导入的，以便于产生相应的指令形式。

在"\_\_declspec"关键字引入之前，微软还提供了另外一个方法来解决这个问题。在这种情况下，对于导入函数的调用，编译器并不区分导入函数和导出函数，它统一地产生直接调用的指令。但是链接器在链接时会将导入函数的目标地址导向一小段桩代码（Stub），由这个桩代码再将控制权交给IAT中的真正目标地址，实现如下：

    CALL 0x0040100C
    ...
    0x0040100C:
    JMP DWORD PTR [0x0040D11C]

即对于调用函数来说，它只是产生一般形式的指令"CALL
XXXXXXXX"，然后在链接时，链接器把这个XXXXXXXX地址重定位到一段桩代码，即那条JMP指令处，然后这条JMP指令才通过IAT间接跳转到导入函数。我们知道，链接器一般情况下是不会产生指令的，那么这段包含JMP指令的桩代码来自何处呢？答案是来自产生DLL文件时伴随的那个LIB文件，即导入库。

编译器在产生导入库时，同一个导出函数会产生两个符号的定义，比如对于函数foo来说，它在导入库中有两个符号，一个是foo，另外一个是\_\_imp\_\_foo。这两个符号的区别是，foo这个符号指向foo函数的桩代码，而\_\_imp\_\_foo指向foo函数在IAT中的位置。所以当我们通过"\_\_declspec(dllimport)"来声明foo导入函数时，编译器在编译时会在该导入函数前加上前缀"\_\_imp\_\_"，以确保跟导入库中的"\_\_imp\_\_foo"能够正确链接；如果不使用"\_\_declspec(dllimport)"，那么编译器将产生一个正常的foo符号引用，以便于跟导入库中的foo符号定义相链接。

现在的MSVC编译器对于以上两种导入方式都支持，即程序员可以通过"\_\_declspec(dllimport)"来声明导入函数，也可以不使用。但我们还是推荐使用"\_\_declspec(dllimport)"，毕竟从性能上来讲，它比不使用该声明少了一条跳转指令。当然它还有其他的好处，我们到后面用到时还会提起。
