# LinePutScript

LinePutScript (LPS) 数据格式的 TypeScript SDK — 一种基于文本的层级键值存储格式。

LPS 是一种简单、人类可读的结构化数据格式，被 [VPet](https://github.com/LorisYounger/VPet) 虚拟桌宠模拟器及其它应用所使用。它以紧凑的面向行的语法表示嵌套的键值对、类型化值、多行文本和注释。

## 安装

```bash
npm install lineputscript
```

需要 Node.js >= 18。

## LPS 格式概述

一份 LinePutScript 文档由若干 **Line** 组成，每个 Line 包含可选的 **Info** 值、零个或多个 **Sub**（嵌套键值对）和可选的 **Text** 内容。

```
Name#Info:||Sub1#Val1:||Sub2#Val2:||TextContent
```

- `#` 分隔行名称和 info 值
- `:|` 分隔行内的子项，并位于文本内容之前
- Sub 与 Line 结构相同，均为 `Name#Value`
- Line 之间以换行符分隔

### 示例

```
note#greeting:|sub#hello:|world
config#settings:|timeout#30:|enabled#true:|production
```

该文档包含两行：
- `note`，info 为 `greeting`，一个子项 (`sub` = `hello`)，文本 `world`
- `config`，info 为 `settings`，两个子项 (`timeout` = `30`, `enabled` = `true`)，文本 `production`

### 转义序列

在 LPS 中具有特殊含义的字符在存储时会被转义，显示时取消转义：

| 字符 | 存储形式 |
|-----------|-----------|
| `\|` | `/\|` |
| `/` | `/!` |
| `:\|` | `/stop` |
| `\t` | `/tab` |
| `\n` | `/n` |
| `\r` | `/r` |
| `#` | `/id` |
| `,` | `/com` |

使用 `textReplace()` 将显示文本转换为存储格式，使用 `textDeReplace()` 将存储格式转换为显示文本。

## 快速入门

```typescript
import { LPS, Line, Sub } from 'lineputscript';

// 解析文档
const doc = new LPS(`name#value:|subkey#subval:|extra text`);

// 读取值
const line = doc.findLine('name');
console.log(line?.infoDisplay); // 'value'
console.log(line?.textDisplay); // 'extra text'
console.log(line?.find('subkey')?.infoDisplay); // 'subval'

// 类型化访问
doc.setLineInt('count', 42);
console.log(doc.getLineInt('count')); // 42

doc.setLineBool('flag', true);
console.log(doc.getLineBool('flag')); // true

// 修改
const vupmod = doc.findorAddLine('vupmod');
vupmod.findorAdd('author').infoDisplay = 'LorisYounger';

// 序列化回字符串
const output = doc.toString();
```

## API 参考

### `Sub`

基础单元 — 一个命名的值对。

```typescript
new Sub()                           // 空 Sub
new Sub('name#value')               // 从 LPS 字符串解析
new Sub('name', 'value')            // 名称 + info
new Sub('tags', 'a', 'b', 'c')      // 多个 info（逗号连接，自动转义）

// 属性
sub.name               // string
sub.info               // 原始存储转义后的 info 字符串
sub.infoDisplay        // 显示用（已取消转义）的 info 字符串
sub.infoToInt          // number
sub.infoToInt64        // bigint
sub.infoToDouble       // number
sub.infoToBoolean      // boolean
sub.infos              // StringStructure（逗号分隔的值作为键值对）

// 方法
sub.getString()        // 获取已取消转义的字符串
sub.getInteger()       // 解析为 int
sub.getInteger64()     // 解析为 bigint
sub.getDouble()        // 解析为 float
sub.getBoolean()       // 解析为 bool（'true'/'t'/'1' → true）
sub.getDateTime()      // 解析为 Date（.NET 刻度或 ISO 字符串）
sub.getFloat()         // 解析为 FInt64
sub.setString(val)     // 从显示字符串设置（自动转义）
sub.setInteger(val)    // 从 number 设置
sub.setInteger64(val)  // 从 bigint 设置
sub.setDouble(val)     // 从 number 设置
sub.setBoolean(val)    // 从 boolean 设置
sub.setDateTime(val)   // 从 Date 设置（.NET 刻度）
sub.setFloat(val)      // 从 FInt64 设置
sub.getInfos()         // 获取逗号分隔的值数组 string[]
sub.first()            // 第一个逗号分隔的值，或 null
sub.last()             // 最后一个逗号分隔的值，或 null
sub.load(lpsString)    // 从 LPS 字符串解析
sub.set(other)         // 从另一个 ISub 复制
sub.toString()         // 序列化为 'name#info:|' 格式
```

### `Line`（继承 `Sub`）

带有子 Sub、文本内容和注释的 Sub。

```typescript
new Line()                              // 空 Line
new Line('name#info:||sub#val:||text')  // 从 LPS 字符串解析
new Line('name', 'info', 'text', [sub1, sub2])

// 属性（除 Sub 的属性外）
line.text          // 原始存储转义的文本
line.textDisplay   // 显示用（已取消转义）的文本
line.textToInt     // number
line.textToInt64   // bigint
line.textToDouble  // number
line.comments      /// 标记后的注释字符串
line.texts         // 文本内容的 StringStructure
line.subs          // ISub[] — 有序的子 Sub 列表

// Sub 管理
line.addSub(sub)
line.addorReplaceSub(sub)
line.addRange([sub1, sub2])
line.insertSub(index, sub)
line.remove(sub)           // boolean
line.removeByName(name)    // boolean
line.removeAll(name)
line.removeAt(index)
line.contains(sub)         // boolean
line.containsByName(name)  // boolean
line.find(name)            // ISub | null
line.find(name, info)      // ISub | null（匹配名称 + info）
line.findInfo(info)        // ISub | null（仅匹配 info）
line.findAll(name)         // ISub[]
line.findorAdd(name)       // 查找已有或创建新的
line.search(value)         // ISub | null（名称子串匹配）
line.searchAll(value)      // ISub[]（名称子串匹配）
line.indexOf(name)         // number
line.indexsOf(name)        // number[]（所有索引）

// Sub 的类型化简写方法（查找或创建，然后获取/设置类型化值）
line.getSubBool(name)         // boolean
line.setSubBool(name, val)
line.getSubInt(name, default?)   // number
line.setSubInt(name, val)
line.getSubInt64(name, default?) // bigint
line.setSubInt64(name, val)
line.getSubDouble(name, default?) // number
line.setSubDouble(name, val)
line.getSubString(name, default?) // string | null
line.setSubString(name, val)
line.getSubFloat(name, default?)  // FInt64
line.setSubFloat(name, val)
line.getSubDateTime(name, default?) // Date | null
line.setSubDateTime(name, val)
```

### `LineDict`（继承 `Sub`）

接口与 `Line` 相同，但底层使用 `Map<string, ISub>` 实现，支持唯一名称的快速 O(1) 查找。添加重复名称时，后添加的会覆盖之前的。

### `LPS` / `LpsDocument`

包含有序 Line 集合的文档。

```typescript
new LPS()                        // 空文档
new LPS(lpsString)               // 从 LPS 字符串解析
new LPS([line1, line2])          // 从 Line 数组创建

// 属性
doc.assemblage      // ILine[]
doc.count           // Line 数量
doc.length          // 估计序列化字节长度

// Line 管理
doc.addLine(line)
doc.addorReplaceLine(line)
doc.addRange([line1, line2])
doc.insertLine(index, line)
doc.remove(line)             // boolean（按引用或名称）
doc.removeAll(target)        // 按引用或名称
doc.removeAt(index)
doc.contains(line)           // boolean（Line 或 Sub）
doc.containsLine(name)       // boolean
doc.containsSub(name)        // boolean

// 查询
doc.findLine(name)           // ILine | null
doc.findLine(name, info)     // ILine | null（匹配名称 + info）
doc.findLineInfo(info)       // ILine | null
doc.findorAddLine(name)      // 查找已有或创建新的
doc.findAllLine(name)        // ILine[]
doc.findAllLineInfo(info)    // ILine[]

// 跨行 Sub 搜索
doc.findSub(name)            // ISub | null（跨所有行，返回第一个匹配）
doc.findSub(name, info)      // ISub | null
doc.findSubInfo(info)        // ISub | null
doc.findAllSub(name)         // ISub[]

// 文本搜索（名称子串匹配）
doc.searchLine(value)        // ILine | null
doc.searchAllLine(value)     // ILine[]
doc.searchSub(value)         // ISub | null
doc.searchAllSub(value)      // ISub[]

doc.indexOf(name)            // number
doc.first()                  // ILine | null
doc.last()                   // ILine | null
doc.load(lpsString)          // 解析/替换内容
doc.toString()               // 序列化为 LPS 字符串

// Line 的类型化简写方法（查找或创建 Line，然后获取/设置类型化 info）
doc.getLineBool(name)
doc.setLineBool(name, val)
doc.getLineInt(name, default?)
doc.setLineInt(name, val)
doc.getLineInt64(name, default?)
doc.setLineInt64(name, val)
doc.getLineDouble(name, default?)
doc.setLineDouble(name, val)
doc.getLineString(name, default?)
doc.setLineString(name, val)
doc.getLineFloat(name, default?)
doc.setLineFloat(name, val)
doc.getLineDateTime(name, default?)
doc.setLineDateTime(name, val)
```

#### `LpsDocument` 继承 `LPS` — 增加游标操作

```typescript
const doc = new LpsDocument(lpsString);

doc.readNext()       // ILine | null — 读取并移动游标
doc.read()           // ILine | null — 仅读取，不移动游标
doc.append(line)     // 在当前游标位置后插入 Line
doc.append(name, info, text, ...subs)  // 创建并插入
doc.appendSub(...subs)      // 向当前 Line 添加 Sub
doc.appendSubByName(name, info)
doc.readReset()      // 重置游标到起始位置
doc.readEnd()        // 将游标移动到末尾之后
doc.readCanNext()    // boolean
doc.lineNode         // 获取/设置游标位置（从 0 开始，自动钳制）
```

### `StringStructure`

对以 `/n` 分隔的 `key=value` 对编码的字符串的字典视图，带缓存。

```typescript
const ss = new StringStructure(
  (val) => { /* 设置器 — 缓存刷新时调用 */ },
  () => /* 获取器 — 返回原始字符串 */
);

ss.setString('key', 'value')
ss.getString('key')           // string | null
ss.getBool('key')             // boolean
ss.setBool('key', true)
ss.getInt('key', default?)    // number
ss.setInt('key', 42)
ss.getInt64('key')            // bigint
ss.getDouble('key')           // number
ss.getFloat('key')            // FInt64
ss.getDateTime('key')         // Date | null
ss.containsKey('key')         // boolean
ss.remove('key')              // boolean
ss.clear()
ss.keys, ss.values, ss.count
ss[Symbol.iterator]()         // 遍历 [key, value] 对
```

### `FInt64`

使用 `bigint` 实现的定点 64 位十进制数（Anchor = 1e9），提供无浮点舍入误差的精确十进制运算。

```typescript
FInt64.fromInt(42)             // 整数 → FInt64
FInt64.fromDouble(3.14)        // 浮点数 → FInt64
FInt64.fromLong(1000000000n)   // 原始 bigint
FInt64.parse('3.14')           // 解析字符串

a.add(b)            // a + b
a.sub(b)            // a - b
a.mul(b)            // a * b
a.div(b)            // a / b
a.compareTo(b)      // -1, 0, 或 1
a.equals(b)         // boolean
a.toDouble()        // number
a.toInt32()         // number（截断）
a.toInt64()         // bigint（截断）

FInt64.Zero, FInt64.One, FInt64.NaN
FInt64.MinValue, FInt64.MaxValue
FInt64.PositiveInfinity, FInt64.NegativeInfinity
```

### 工具函数

```typescript
import { textReplace, textDeReplace, getHashCode, getHashCode32, splitLimited } from 'lineputscript';

textReplace('hello|world')    // → 'hello/!|world'（显示 → 存储）
textDeReplace('hello/!|world') // → 'hello|world'（存储 → 显示）
getHashCode('text')           // → bigint（基于 SHA-512, 64 位小端）
getHashCode32('text')         // → number（32 位）
splitLimited('a:b:c', ':', 1) // → ['a', 'b:c']
```

## TypeScript

本包使用 TypeScript 编写，并附带类型声明文件。所有公共 API 均有完整类型定义。

## 许可证

MIT
