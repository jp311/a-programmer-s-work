## 5.4 调试信息

COFF文件中所有以".debug"开始的段都包含着调试信息。比如".debug\$S"表示包含的是符号（Symbol）相关的调试信息段；".debug\$P"表示包含预编译头文件（Precompiled
Header
Files）相关的调试信息段；".debug\$T"表示包含类型（Type）相关的调试信息段。在"SimpleSection.obj"中，我们只看到了".debug\$S"段，也就是只有调试时的相关信息。我们可以从该段的文本信息中看到目标文件的原始路径，编译器信息等。调试信息段的具体格式被定义在PE格式文件标准中，我们在这里就不详细展开了。调试段相关信息在"SimpleSection.txt"中的内容如下：

    SECTION HEADER #2
    .debug$S name
        0 physical address
        0 virtual address
         86 size of raw data
          F4 file pointer to raw data (000000F4 to 00000179)
        0 file pointer to relocation table
        0 file pointer to line numbers
        0 number of relocations
        0 number of line numbers
    42100040 flags
             Initialized Data
             Discardable
             1 byte align
             Read Only

    RAW DATA #2
      00000000: 02 00 00 00 46 00 09 00 00 00 00 00 3F 43 3A 5C  ....F.......?C:\
      00000010: 57 6F 72 6B 69 6E 67 5C 62 6F 6F 6B 5C 63 6F 64  Working\book\cod
      00000020: 65 5C 43 68 61 70 74 65 72 20 32 5C 53 69 6D 70  e\Chapter 2\Simp
      00000030: 6C 65 53 65 63 74 69 6F 6E 73 5C 53 69 6D 70 6C  leSections\Simpl
      00000040: 65 53 65 63 74 69 6F 6E 2E 6F 62 6A 38 00 13 10  eSection.obj8...
      00000050: 00 22 00 00 07 00 0E 00 00 00 27 C6 0E 00 00 00  ."........'?....
      00000060: 27 C6 21 4D 69 63 72 6F 73 6F 66 74 20 28 52 29  '?!Microsoft (R)
      00000070: 20 4F 70 74 69 6D 69 7A 69 6E 67 20 43 6F 6D 70   Optimizing Comp
