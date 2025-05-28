## A.3 常用开发工具命令行参考

### A.3.1 gcc，GCC编译器

- -E：只进行预处理并把预处理结果输出。
- -c：只编译不链接。
- -o \<filename\>：指定输出文件名。
- -S：输出编译后的汇编代码文件。
- -I：指定头文件路径。
- -e name：指定name为程序入口地址。
- -ffreestanding：编译独立的程序，不会自动链接C运行库、启动文件等。
- -finline-functions,-fno-inline-functions：启用/关闭内联函数。
- -g：在编译结果中加入调试信息，-ggdb就是加入GDB调试器能够识别的格式。
- -L \<directory\>：指定链接时查找路径，多个路径之间用冒号隔开。
- -nostartfiles：不要链接启动文件，比如crtbegin.o、crtend.o。
- -nostdlib：不要链接标准库文件，主要是C运行库。
- -O0：关闭所有优化选项。
- -shared：产生共享对象文件。
- -static：使用静态链接。
- -Wall：对源代码中的多数编译警告进行启用。
- -fPIC：使用地址无关代码模式进行编译。
- -fPIE：使用地址无关代码模式编译可执行文件。
- -XLinker \<option\>：把option传递给链接器。
- -Wl \<option\>：把option传递给链接器，与上面的选项类似。
- -fomit-frame-pointer：禁止使用EBP作为函数帧指针。
- -fno-builtin：禁止GCC编译器内置函数。
- -fno-stack-protector：是指关闭堆栈保护功能。
- -ffunction-sections：将每个函数编译到独立的代码段。
- -fdata-sections：将全局/静态变量编译到独立的数据段。

### A.3.2 ld，GNU链接器

- -static：静态链接。
- -l\<libname\>：指定链接某个库。
- -e name：指定name为程序入口。
- -r：合并目标文件，不进行最终链接。
- -L \<directory\>：指定链接时查找路径，多个路径之间用冒号隔开。
- -M：将链接时的符号和地址输出成一个映射文件。
- -o：指定输出文件名。
- -s：清除输出文件中的符号信息。
- -S：清除输出文件中的调试信息。
- -T \<scriptfile\>：指定链接脚本文件。
- -version-script \<file\>：指定符号版本脚本文件。
- -soname \<name\>：指定输出共享库的SONAME。
- -export-dynamic：将全局符号全部导出。
- -verbose：链接时输出详细信息。
- -rpath \<path\>：指定链接时库查找路径。

### A.3.3 objdump，GNU目标文件可执行文件查看器

- -a：列举.a文件中所有的目标文件。
- -b bfdname：指定BFD名。
- -C：对于C++符号名进行反修饰（Demangle）。
- -g：显示调试信息。
- -d：对包含机器指令的段进行反汇编。
- -D：对所有的段进行反汇编。
- -f：显示目标文件文件头。
- -h：显示段表。
- -l：显示行号信息。
- -p：显示专有头部信息，具体内容取决于文件格式。
- -r：显示重定位信息。
- -R：显示动态链接重定位信息。
- -s：显示文件所有内容。
- -S：显示源代码和反汇编代码（包含-d参数）。
- -W：显示文件中包含有DWARF调试信息格式的段。
- -t：显示文件中的符号表。
- -T：显示动态链接符号表。
- -x：显示文件的所有文件头。

### A.3.4 cl，MSVC编译器

- /c：只编译不链接。
- /Za：禁止语言扩展。
- /link：链接指定的模块或给链接器传递参数。
- /Od：禁止优化。
- /O2：以运行速度最快为目标优化。
- /O1：以最节省空间为目标优化。
- /GR或/GR-：开启或关闭RTTI。
- /Gy：开启函数级别链接。
- /GS或/GS-：开启或关闭。
- /Fa\[file\]：输出汇编文件。
- /E：只进行预处理并且把结果输出。
- /I：指定头文件包含目录。
- /Zi：启用调试信息。
- /LD：编译产生DLL文件。
- /LDd：编译产生DLL文件（调试版）。
- /MD：与动态多线程版本运行库MSVCRT.LIB链接。
- /MDd：与调试版动态多线程版本运行库MSVCRTD.LIB链接。
- /MT：与静态多线程版本运行库LIBCMT.LIB链接。
- /MTd：与调试版静态多线程版本运行库LIBCMTD.LIB链接。

### A.3.5 link，MSVC链接器

- /BASE:address：指定输出文件的基地址。
- /DEBUG：输出调试模式版本。
- /DEF:filename：指定模块定义文件.DEF。
- /DEFAULTLIB:library：指定默认运行库。
- /DLL：产生DLL。
- /ENTRY:symbol：指定程序入口。
- /EXPORT:symbol：指定某个符号为导出符号。
- /HEAP：指定默认堆大小。
- /LIBPATH:dir：指定链接时库搜索路径。
- /MAP\[:filename\]：产生链接MAP文件。
- /NODEFAULTLIB\[:library\]：禁止默认运行库。
- /OUT:filename：指定输出文件名。
- /RELEASE：以发布版本产生输出文件。
- /STACK：指定默认栈大小。
- /SUBSYSTEM：指定子系统。

### A.3.6 dumpbin，MSVC的COFF/PE文件查看器

- /ALL：显示所有信息。
- /ARCHIVEMEMBERS：显示.LIB文件中所有目标文件列表。
- /DEPENDENTS：显示文件的动态链接依赖关系。
- /DIRECTIVES：显示链接器指示。
- /DISASM：显示反汇编。
- /EXPORTS：显示导出函数表。
- /HEADERS：显示文件头。
- /IMPORTS：显示导入函数表。
- /LINENUMBERS：显示行号信息。
- /RELOCATIONS：显示重定位信息。
- /SECTION:name ：显示某个段。
- /SECTION：显示文件概要信息。
- /SYMBOLS：显示文件符号表。
- /TLS：显示线程局部存储TLS信息。
