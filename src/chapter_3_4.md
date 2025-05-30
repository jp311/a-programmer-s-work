## 3.4 ELF文件结构描述

我们已经通过SimpleSection.o的结构大致了解了ELF文件的轮廓，接着就来看看ELF文件的结构格式。图3-4描述的是ELF目标文件的总体结构，我们省去了ELF一些繁琐的结构，把最重要的结构提取出来，形成了如图3-4所示的ELF文件基本结构图，随着我们讨论的展开，ELF文件结构会在这个基本结构之上慢慢变得复杂起来。

![](images/3-4.jpg)\
图3-4 ELF结构

ELF目标文件格式的最前部是ELF文件头（ELF
Header），它包含了描述整个文件的基本属性，比如ELF文件版本、目标机器型号、程序入口地址等。紧接着是ELF文件各个段。其中ELF文件中与段有关的重要结构就是段表（Section
Header
Table），该表描述了ELF文件包含的所有段的信息，比如每个段的段名、段的长度、在文件中的偏移、读写权限及段的其他属性。接着将详细分析ELF文件头、段表等ELF关键的结构。另外还会介绍一些ELF中辅助的结构，比如字符串表、符号表等，这些结构我们在本节只是简单介绍一下，到相关章节中再详细展开。

### 3.4.1 文件头

我们可以用readelf命令来详细查看ELF文件，代码如清单3-2所示。

清单3-2 查看ELF文件头

    $readelf –h SimpleSection.o
    ELF Header:
      Magic:   7f 45 4c 46 01 01 01 00 00 00 00 00 00 00 00 00
      Class:                              ELF32
      Data:                             2's complement, little endian
      Version:                          1 (current)
      OS/ABI:                             UNIX - System V
      ABI Version:                    0
      Type:                               REL (Relocatable file)
      Machine:                            Intel 80386
      Version:                        0x1
      Entry point address:            0x0
      Start of program headers:       0 (bytes into file)
      Start of section headers:       280 (bytes into file)
      Flags:                          0x0
      Size of this header:          52 (bytes)
      Size of program headers:        0 (bytes)
      Number of program headers:      0
      Size of section headers:        40 (bytes)
      Number of section headers:      11
      Section header string table index:  8

从上面输出的结果可以看到，ELF的文件头中定义了ELF魔数、文件机器字节长度、数据存储方式、版本、运行平台、ABI版本、ELF重定位类型、硬件平台、硬件平台版本、入口地址、程序头入口和长度、段表的位置和长度及段的数量等。这些数值中有关描述ELF目标平台的部分，与我们常见的32位Intel的硬件平台基本上一样。

ELF文件头结构及相关常数被定义在"/usr/include/elf.h"里，因为ELF文件在各种平台下都通用，ELF文件有32位版本和64位版本。它的文件头结构也有这两种版本，分别叫做"Elf32_Ehdr"和"Elf64_Ehdr"。32位版本与64位版本的ELF文件的文件头内容是一样的，只不过有些成员的大小不一样。为了对每个成员的大小做出明确的规定以便于在不同的编译环境下都拥有相同的字段长度，"elf.h"使用typedef定义了一套自己的变量体系，如表3-3所示。

![](images/3-0-3.jpg)\
表3-3

我们这里以32位版本的文件头结构"Elf32_Ehdr"作为例子来描述，它的定义如下：

    typedef struct {
        unsigned char e_ident[16];
        Elf32_Half e_type;
        Elf32_Half e_machine;
        Elf32_Word e_version;
        Elf32_Addr e_entry;
        Elf32_Off  e_phoff;
        Elf32_Off  e_shoff;
        Elf32_Word e_flags;
        Elf32_Half e_ehsize;
        Elf32_Half e_phentsize;
        Elf32_Half e_phnum;
        Elf32_Half e_shentsize;
        Elf32_Half e_shnum;
        Elf32_Half e_shstrndx;
    } Elf32_Ehdr;

让我们拿ELF文件头结构跟前面readelf输出的ELF文件头信息相比照，可以看到输出的信息与ELF文件头中的结构很多都一一对应。有点例外的是"Elf32_Ehdr"中的e_ident这个成员对应了readelf输出结果中的"Class"、"Data"、"Version"、"OS/ABI"和"ABI
Version"这5个参数。剩下的参数与"Elf32_Ehdr"中的成员都一一对应。我们在表3-4中简单地列举一下，让大家有个初步的印象，详细的定义可以在ELF标准文档里面找到。表3-4是ELF文件头中各个成员的含义与readelf输出结果的对照表。

![](images/3-0-4.jpg)\
![](images/3-0-4-2.jpg)\
表3-4 ELF文件头结构成员含义

这些字段的相关常量都定义在"elf.h"里面，我们在表3-5中会列举一些常见的常量，完整的常量定义请参考"elf.h"。

**ELF魔数**
我们可以从前面readelf的输出看到，最前面的"Magic"的16个字节刚好对应"Elf32_Ehdr"的e_ident这个成员。这16个字节被ELF标准规定用来标识ELF文件的平台属性，比如这个ELF字长（32位/64位）、字节序、ELF文件版本，如图3-5所示。

![](images/3-5.jpg)\
图3-5 ELF 魔数

最开始的4个字节是所有ELF文件都必须相同的标识码，分别为0x7F、0x45、0x4c、0x46，第一个字节对应ASCII字符里面的DEL控制符，后面3个字节刚好是ELF这3个字母的ASCII码。这4个字节又被称为ELF文件的魔数，几乎所有的可执行文件格式的最开始的几个字节都是魔数。比如a.out格式最开始两个字节为
0x01、0x07；PE/COFF文件最开始两个个字节为0x4d、0x5a，即ASCII字符MZ。这种魔数用来确认文件的类型，操作系统在加载可执行文件的时候会确认魔数是否正确，如果不正确会拒绝加载。

接下来的一个字节是用来标识ELF的文件类的，0x01表示是32位的，0x02表示是64位的；第6个字是字节序，规定该ELF文件是大端的还是小端的（见附录：字节序）。第7个字节规定ELF文件的主版本号，一般是1，因为ELF标准自1.2版以后就再也没有更新了。后面的9个字节ELF标准没有定义，一般填0，有些平台会使用这9个字节作为扩展标志。

> **各种魔数的由来**
>
> a.out格式的魔数为0x01、0x07，为什么会规定这个魔数呢？
>
> UNIX早年是在PDP小型机上诞生的，当时的系统在加载一个可执行文件后直接从文件的第一个字节开始执行，人们一般在文件的最开始放置一条跳转（jump）指令，这条指令负责跳过接下来的7个机器字的文件头到可执行文件的真正入口。而0x01
> 0x07这两个字节刚好是当时PDP-11的机器的跳转7个机器字的指令。为了跟以前的系统保持兼容性，这条跳转指令被当作魔数一直被保留到了几十年后的今天。
>
> 计算机系统中有很多怪异的设计背后有着很有趣的历史和传统，了解它们的由来可以让我们了解到很多很有意思的事情。这让我想起了经济学里面所谓的"路径依赖"，其中一个很有意思的叫"马屁股决定航天飞机"的故事在网上流传很广泛，有兴趣的话你可以在google以"马屁股"和"航天飞机"作为关键字搜索一下。

> **ELF文件标准历史**
>
> 20世纪90年代，一些厂商联合成立了一个委员会，起草并发布了一个ELF文件格式标准供公开使用，并且希望所有人能够遵循这项标准并且从中获益。1993年，委员会发布了ELF文件标准。当时参与该委员会的有来自于编译器的厂商，如Watcom和Borland；来自CPU的厂商如IBM和Intel；来自操作系统的厂商如IBM和Microsoft。1995年，委员会发布了ELF
> 1.2标准，自此委员会完成了自己的使命，不久就解散了。所以ELF文件格式标准的最新版本为1.2。

**文件类型**
e_type成员表示ELF文件类型，即前面提到过的3种ELF文件类型，每个文件类型对应一个常量。系统通过这个常量来判断ELF的真正文件类型，而不是通过文件的扩展名。相关常量以"ET\_"开头，如表3-5所示。

![](images/3-0-5.jpg)\
表3-5

**机器类型**
ELF文件格式被设计成可以在多个平台下使用。这并不表示同一个ELF文件可以在不同的平台下使用（就像java的字节码文件那样），而是表示不同平台下的ELF文件都遵循同一套ELF标准。e_machine成员就表示该ELF文件的平台属性，比如3表示该ELF文件只能在Intel
x86机器下使用，这也是我们最常见的情况。相关的常量以"EM\_"开头，如表3-6所示。

![](images/3-0-6.jpg)\
表3-6

### 3.4.2 段表

我们知道ELF文件中有很多各种各样的段，这个段表（Section Header
Table）就是保存这些段的基本属性的结构。段表是ELF文件中除了文件头以外最重要的结构，它描述了ELF的各个段的信息，比如每个段的段名、段的长度、在文件中的偏移、读写权限及段的其他属性。也就是说，ELF文件的段结构就是由段表决定的，编译器、链接器和装载器都是依靠段表来定位和访问各个段的属性的。段表在ELF文件中的位置由ELF文件头的"e_shoff"成员决定，比如SimpleSection.o中，段表位于偏移0x118。

前文中我们使用了"objudmp
-h"来查看ELF文件中包含的段，结果是SimpleSection里面看到了总共有6个段，分别是".code"、".data"、".bss"、".rodata"、".comment"和".note.GNU-stack"。实际上的情况却有所不同，"objdump
-h"命令只是把ELF文件中关键的段显示了出来，而省略了其他的辅助性的段，比如：符号表、字符串表、段名字符串表、重定位表等。我们可以使用readelf工具来查看ELF文件的段，它显示出来的结果才是真正的段表结构：

    $ readelf -S SimpleSection.o
    There are 11 section headers, starting at offset 0x118:

    Section Headers:
     [Nr] Name          Type      Addr     Off    Size   ES Flg Lk Inf Al
     [ 0]               NULL      00000000 000000 000000 00 0   0  0
     [ 1] .text         PROGBITS  00000000 000034 00005b 00 AX  0  0   4
     [ 2] .rel.text     REL       00000000 000428 000028 08     9  1   4
     [ 3] .data         PROGBITS  00000000 000090 000008 00 WA  0  0   4
     [ 4] .bss          NOBITS    00000000 000098 000004 00 WA  0  0   4
     [ 5] .rodata       PROGBITS  00000000 000098 000004 00 A   0  0   1
     [ 6] .comment        PROGBITS  00000000 00009c 00002a 00 0   0  1
     [ 7] .note.GNU-stack PROGBITS  00000000 0000c6 000000 00 0   0  1
     [ 8] .shstrtab   STRTAB    00000000 0000c6 000051 00 0   0  1
     [ 9] .symtab       SYMTAB    00000000 0002d0 0000f0 10     10 10   4
     [10] .strtab       STRTAB    00000000 0003c0 000066 00 0   0  1
    Key to Flags:
      W (write), A (alloc), X (execute), M (merge), S (strings)
      I (info), L (link order), G (group), x (unknown)
      O (extra OS processing required) o (OS specific), p (processor specific)

readelf输出的结果就是ELF文件段表的内容，那么就让我们对照这个输出来看看段表的结构。段表的结构比较简单，它是一个以"Elf32_Shdr"结构体为元素的数组。数组元素的个数等于段的个数，每个"Elf32_Shdr"结构体对应一个段。"Elf32_Shdr"又被称为段描述符（Section
Descriptor）。对于SimpleSection.o来说，段表就是有11个元素的数组。ELF段表的这个数组的第一个元素是无效的段描述符，它的类型为"NULL"，除此之外每个段描述符都对应一个段。也就是说SimpleSection.o共有10个有效的段。

> **数组的存放方式**
>
> ELF文件里面很多地方采用了这种与段表类似的数组方式保存。一般定义一个固定长度的结构，然后依次存放。这样我们就可以使用下标来引用某个结构。

Elf32_Shdr被定义在"/usr/include/elf.h"，代码如清单3-3所示。

清单3-3 Elf32_Shdr段描述符结构

    typedef struct
    {
      Elf32_Word    sh_name;
      Elf32_Word    sh_type;
      Elf32_Word    sh_flags;
      Elf32_Addr    sh_addr;
      Elf32_Off     sh_offset;
      Elf32_Word    sh_size;
      Elf32_Word    sh_link;
      Elf32_Word    sh_info;
      Elf32_Word    sh_addralign;
      Elf32_Word    sh_entsize;
    } Elf32_Shdr;

Elf32_Shdr的各个成员的含义如表3-7所示。

![](images/3-0-7.jpg)\
表3-7

*注
1：事实上段的名字对于编译器、链接器来说是有意义的，但是对于操作系统来说并没有实质的意义，对于操作系统来说，一个段该如何处理取决于它的属性和权限，即由段的类型和段的标志位这两个成员决定。*\
*注
2：关于这些字段，涉及一些映像文件的加载的概念，我们将在本书的第2部分详细介绍其相关内容，读者也可以先阅读第2部分的最前面一章"可执行文件的装载于进程"，了解一下加载的概念，然后再来阅读关于段的虚拟大小和虚拟地址的内容。当然，如果读者对映像文件加载过程比较熟悉，应该很容易理解这些内容。*

让我们对照Elf32_Shdr和"readelf
-S"的输出结果，可以很明显看到，结构体的每一个成员对应于输出结果中从第二列"Name"开始的每一列。于是SimpleSection的段表的位置如图3-6所示。

到了这一步，我们才彻彻底底把SimpleSection的所有段的位置和长度给分析清楚了。在图3-6中，SectionTable长度为0x1b8，也就是440个字节，它包含了11个段描述符，每个段描述符为40个字节，这个长度刚好等于sizeof(Elf32_Shdr)，符合段描述符的结构体长度；整个文件最后一个段".rel.text"结束后，长度为0x450，即1104字节，即刚好是SimpleSection.o的文件长度。中间Section
Table和".rel.text"都因为对齐的原因，与前面的段之间分别有一个字节和两个字节的间隔。

![](images/3-6.jpg)\
图3-6 SimpleSection.o 的Section Table及所有段的位置和长度

**段的类型（sh_type）**
正如前面所说的，段的名字只是在链接和编译过程中有意义，但它不能真正地表示段的类型。我们也可以将一个数据段命名为".text"，对于编译器和链接器来说，主要决定段的属性的是段的类型（sh_type）和段的标志位（sh_flags）。段的类型相关常量以SHT_开头，列举如表3-8所示。

![](images/3-0-8.jpg)\
![](images/3-0-8-2.jpg)\
表3-8

**段的标志位（sh_flag）**
段的标志位表示该段在进程虚拟地址空间中的属性，比如是否可写，是否可执行等。相关常量以SHF_开头，如表3-9所示。

![](images/3-0-9.jpg)\
表3-9

对于系统保留段，表3-10列举了它们的属性。

![](images/3-0-10.jpg)\
![](images/3-0-10-2.jpg)\
表3-10

**段的链接信息（sh_link、sh_info）**
如果段的类型是与链接相关的（不论是动态链接或静态链接），比如重定位表、符号表等，那么sh_link和sh_info这两个成员所包含的意义如表3-11所示。对于其他类型的段，这两个成员没有意义。

![](images/3-0-11.jpg)\
表3-11

### 3.4.3 重定位表

我们注意到，SimpleSection.o中有一个叫做".rel.text"的段，它的类型（sh_type）为"SHT_REL"，也就是说它是一个重定位表（Relocation
Table）。正如我们最开始所说的，链接器在处理目标文件时，须要对目标文件中某些部位进行重定位，即代码段和数据段中那些对绝对地址的引用的位置。这些重定位的信息都记录在ELF文件的重定位表里面，对于每个须要重定位的代码段或数据段，都会有一个相应的重定位表。比如SimpleSection.o中的".rel.text"就是针对".text"段的重定位表，因为".text"段中至少有一个绝对地址的引用，那就是对"printf"函数的调用；而".data"段则没有对绝对地址的引用，它只包含了几个常量，所以SimpleSection.o中没有针对".data"段的重定位表".rel.data"。

一个重定位表同时也是ELF的一个段，那么这个段的类型（sh_type）就是"SHT_REL"类型的，它的"sh_link"表示符号表的下标，它的"sh_info"表示它作用于哪个段。比如".rel.text"作用于".text"段，而".text"段的下标为"1"，那么".rel.text"的"sh_info"为"1"。

关于重定位表的内部结构我们在这里先不展开了，在下一章分析静态链接过程的时候，我们还会详细地分析重定位表的结构。

### 3.4.4 字符串表

ELF文件中用到了很多字符串，比如段名、变量名等。因为字符串的长度往往是不定的，所以用固定的结构来表示它比较困难。一种很常见的做法是把字符串集中起来存放到一个表，然后使用字符串在表中的偏移来引用字符串。比如表3-12这个字符串表。

![](images/3-0-12.jpg)\
表3-12

那么偏移与它们对应的字符串如表3-13所示。

![](images/3-0-13.jpg)\
表3-13

通过这种方法，在ELF文件中引用字符串只须给出一个数字下标即可，不用考虑字符串长度的问题。一般字符串表在ELF文件中也以段的形式保存，常见的段名为".strtab"或".shstrtab"。这两个字符串表分别为字符串表（String
Table）和段表字符串表（Section Header String
Table）。顾名思义，字符串表用来保存普通的字符串，比如符号的名字；段表字符串表用来保存段表中用到的字符串，最常见的就是段名（sh_name）。

接着我们再回头看这个ELF文件头中的"e_shstrndx"的含义，我们在前面提到过，"e_shstrndx"是Elf32_Ehdr的最后一个成员，它是"Section
header string table
index"的缩写。我们知道段表字符串表本身也是ELF文件中的一个普通的段，知道它的名字往往叫做".shstrtab"。那么这个"e_shstrndx"就表示".shstrtab"在段表中的下标，即段表字符串表在段表中的下标。前面的SimpleSection.o中，"e_shstrndx"的值为8，我们再对照"readelf
-S"的输出结果，可以看到".shstrtab"这个段刚好位于段表中的下标为8的位置上。由此，我们可以得出结论，只有分析ELF文件头，就可以得到段表和段表字符串表的位置，从而解析整个ELF文件。
