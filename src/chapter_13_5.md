## 13.5 本章小结

在这一章中，我们首先尝试实现了一个支持C运行的简易CRT：Mini
CRT。接着又为它加上了一些C++语言特性的支持，并且将它称为Mini
CRT++。在实现C语言运行库的时候，介绍了入口函数entry、堆分配算法malloc/free、IO和文件操作fopen/fread/fwrite/fclose、字符串函数strlen/strcmp/atoi和格式化字符串printf/fprintf。在实现C++运行库时，着眼于实现C++的几个特性：new/delete、全局构造和析构、stream和string类。

因此在实现Mini
CRT++的过程中，我们得以详细了解并且亲自动手实现运行库的各个细节，得到一个可编译运行的瘦身运行库版本。当然，Mini
CRT++所包含的仅仅是真正的运行库的一个很小子集，它并不追求完整，也不在运行性能上做优化，它仅仅是一个CRT的雏形，虽说很小，但能够通过Mini
CRT++窥视真正的CRT和C++运行库的全貌，抛砖引玉、举一反三正是Mini
CRT++的目的。
