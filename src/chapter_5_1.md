## 5.1 Windows的二进制文件格式PE/COFF

在32位Windows平台下，微软引入了一种叫PE（Protable
Executable）的可执行格式。作为Win32平台的标准可执行文件格式，PE有着跟ELF一样良好的平台扩展性和灵活性。PE文件格式事实上与ELF同根同源，它们都是由COFF（Common
Object File
Format）格式发展而来的，更加具体地讲是来源于当时著名的DEC（Digital
Equipment
Corporation）的VAX/VMS上的COFF文件格式。因为当微软开始开发Windows
NT的时候，最初的成员都是来自于DEC公司的VAX/VMS小组，所以他们很自然就将原来系统上熟悉的工具和文件格式都搬了过来，并且在此基础上做重新设计和改动。

微软将它的可执行文件格式命名为"Portable
Executable"，从字面意义上讲是希望这个可执行文件格式能够在不同版本的Windows平台上使用，并且可以支持各种CPU。比如从Windows
NT、Windows 95到Windows XP及Windows Vista，还有Windows
CE都是使用PE可执行文件格式。不过可惜的是Windows的PC版只支持x86的CPU，所以我们几乎只要关注PE在x86上的各种性质就行了。

请注意，上面在讲到PE文件格式的时候，只是说Windows平台下的可执行文件采用该格式。事实上，在Windows平台，VISUAL
C++编译器产生的目标文件仍然使用COFF格式。由于PE是COFF的一种扩展，所以它们的结构在很大程度上相同，甚至跟ELF文件的基本结构也相同，都是基于段的结构。所以我们下面在讨论Windows平台上的文件结构时，目标文件默认为COFF格式，而可执行文件为PE格式。但很多时候我们可以将它们统称为PE/COFF文件，当然我们在下文中也会对比PE与COFF在结构方面的区别之处。

随着64位Windows的发布，微软对64位Windows平台上的PE文件结构稍微做了一些修改，这个新的文件格式叫做PE32+。新的PE32+并没有添加任何结构，最大的变化就是把那些原来32位的字段变成了64位，比如文件头中与地址相关的字段。绝大部分情况下，PE32+与PE的格式一致，我们可以将它看作是一般的PE文件。

与ELF文件相同，PE/COFF格式也是采用了那种基于段的格式。一个段可以包含代码、数据或其他信息，在PE/COFF文件中，至少包含一个代码段，这个代码段的名字往往叫做".code"，数据段叫做".data"。不同的编译器产生的目标文件的段名不同，VISUAL
C++使用".code"和".data"，而Borland的编译器使用"CODE"，"DATA"。也就是说跟ELF一样，段名只有提示性作用，并没有实际意义。当然，如果使用链接脚本来控制链接，段名可能会起到一定的作用。

跟ELF一样，PE中也允许程序员将变量或函数放到自定义的段。在GCC中我们使用"\_\_attribute\_\_((section(\"name\")))"扩展属性，在VISUAL
C++中可以使用"#pragma"编译器指示。比如下面这个语句：

    #pragma data_seg("FOO")
    int global = 1;
    #pragma data_seg(".data")

就表示把所有全局变量"global"放到"FOO"段里面去，然后再使用"#pragram"将这个编译器指示换回来，恢复到".data"，否则，任何全局变量和静态变量都会被放到"FOO"段。
