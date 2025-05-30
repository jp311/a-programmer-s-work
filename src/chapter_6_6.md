## 6.6 Windows PE的装载

PE文件的装载跟ELF有所不同，由于PE文件中，所有段的起始地址都是页的倍数，段的长度如果不是页的整数倍，那么在映射时向上补齐到页的整数倍，我们也可以简单地认为在32位的PE文件中，段的起始地址和长度都是4
096字节的整数倍。由于这个特点，PE文件的映射过程会比ELF简单得多，因为它无须考虑如ELF里面诸多段地址对齐之类的问题，虽然这样会浪费一些磁盘和内存空间。PE可执行文件的段的数量一般很少，不像ELF中经常有十多个"Section"，最后不得不使用"Segment"的概念把它们合并到一起装载，PE文件中，链接器在生产可执行文件时，往往将所有的段尽可能地合并，所以一般只有代码段、数据段、只读数据段和BSS等为数不多的几个段。

PE文件的装载跟ELF有所不同，由于PE文件中，所有段的起始地址都是页的倍数，段的长度如果不是页的整数倍，那么在映射时向上补齐到页的整数倍，我们也可以简单地认为在32位的PE文件中，段的起始地址和长度都是4
096字节的整数倍。由于这个特点，PE文件的映射过程会比ELF简单得多，因为它无须考虑如ELF里面诸多段地址对齐之类的问题，虽然这样会浪费一些磁盘和内存空间。PE可执行文件的段的数量一般很少，不像ELF中经常有十多个"Section"，最后不得不使用"Segment"的概念把它们合并到一起装载，PE文件中，链接器在生产可执行文件时，往往将所有的段尽可能地合并，所以一般只有代码段、数据段、只读数据段和BSS等为数不多的几个段。

在讨论结构的具体装载过程之前，我们要先引入一个PE里面很常见的术语叫做RVA（Relative
Virtual
Address），它表示一个相对虚拟地址。这个术语看起来比较晦涩难懂，其实它的概念很简单，就是相当于文件中的偏移量的东西。它是相对于PE文件的装载基地址的一个偏移地址。比如，一个PE文件被装载到虚拟地址（VA）0x00400000，那么一个RVA为0x1000的地址就是0x00401000。每个PE文件在装载时都会有一个装载目标地址（Target
Address），这个地址就是所谓的基地址（Base
Address）。由于PE文件被设计成可以装载到任何地址，所以这个基地址并不是固定的，每次装载时都可能会变化。如果PE文件中的地址都使用绝对地址，它们都要随着基地址的变化而变化。但是，如果使用RVA这样一种基于基地址的相对地址，那么无论基地址怎么变化，PE文件中的各个RVA都保持一致。这里涉及PE可执行文件装载的一些内容，我们只是简单介绍一下，更加详细的内容将留到本书后面有关PE文件的Rebasing机制时再进行分析。

装载一个PE可执行文件并且装载它，是个比ELF文件相对简单的过程：

- 先读取文件的第一个页，在这个页中，包含了DOS头、PE文件头和段表。
- 检查进程地址空间中，目标地址是否可用，如果不可用，则另外选一个装载地址。这个问题对于可执行文件来说基本不存在，因为它往往是进程第一个装入的模块，所以目标地址不太可能被占用。主要是针对DLL文件的装载而言的，我们在后面的"Rebasing"这一节还会具体介绍这个问题。
- 使用段表中提供的信息，将PE文件中所有的段一一映射到地址空间中相应的位置。
- 如果装载地址不是目标地址，则进行Rebasing。
- 装载所有PE文件所需要的DLL文件。
- 对PE文件中的所有导入符号进行解析。
- 根据PE头中指定的参数，建立初始化栈和堆。
- 建立主线程并且启动进程。

PE文件中，与装载相关的主要信息都包含在PE扩展头（PE Optional
Header）和段表，我们在第2部分已经介绍过了PE扩展头部分结构，这里我们将选择几个跟装载相关的成员来分析它们的含义（见表6-6），当然还有一部分成员是跟进程初始化和运行库有关的，我们把它们留到本书的第4部分介绍。

![](../Images/6-0-6.jpg)\
表6-6
