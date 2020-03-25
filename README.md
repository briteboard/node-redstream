
Handcrafted TypeScript optimized library for Redis Stream. This library is uses [ioRedis](https://github.com/luin/ioredis) as backend (peer dependencies)

## Install

```sh
# ioredis is a peer library, so must be installed
npm install ioredis 
npm install -D @types/ioredis
```

## Example

```ts
import { deepStrictEqual as equal } from 'assert';
import IORedis from 'ioredis';
import redstream, { stringDataParser } from 'redstream';

// Requisite: on local host, 
//  - install and start 'redis-server' or
//  - run 'docker run -p 6379:6379 -it redis:5' (in a terminal)

main();

async function main() {
  // create a ioRedis the ioRedis way (here default everything)
  const ioRedis = new IORedis();

  //// Default RedStream, string name/value object

  // create a default RedStream (string name/value)
  const streamDefault = redstream(ioRedis, 'stream1');

  // xtrim to 0 for this usecase to make sure the first read match the first xadd
  await streamDefault.xtrim(0, true); // true for exact (default is fast/approximate);

  const id = await streamDefault.xadd({ 'temperature': '25', 'pressure': '1013.25' });
  const result1 = await streamDefault.xread(); // default from id '0' and no count
  const entry1 = result1?.entries[0];
  equal(entry1?.id, id);
  console.log(entry1?.data);
  // {temperatur: '25', pressure: '1013.25'}


  //// Typed RedStream

  // create a dataParser
  const metricDataParser = (dataArr: string[]) => {
    // Here we use the provided string dataParser to start
    // parse string [name, value, ...] array to string {name: value, ...} object
    const stringData = stringDataParser(dataArr);
    // Then, we return the typed data
    return {
      temperature: Number(stringData.temperature),
      pressure: Number(stringData.pressure)
    }
  } // TS infer return {temperature: number, pressure: number}

  // create a typed RedStream from a specicification (with the dataParser above)
  const streamTyped = redstream(ioRedis, { key: 'stream1', dataParser: metricDataParser });
  // now streamTypes.xadd is TS typed
  await streamTyped.xadd({ 'temperature': 15, 'pressure': 800.45 });
  const result2 = await streamDefault.xread(id); // after the previous id
  console.log(result2?.entries[0].data);
  // {temperature: 15, pressure: 800.45}

  // all commands, xrange, xrevrange, ... are fully typed now. 

  await ioRedis.disconnect();
}
```

### xread example

After the example above: 

```ts
  // the xread object
  const xreadResult = await streamTyped.xread(); // default from 0
  console.log(JSON.stringify(xreadResult, null, '  ')); // see below
```

Would return:
```js
{
  "key": "stream1",
  "qid": "0",
  "smallest": "1585504199191-0",
  "highest": "1585504199195-0",
  "entries": [
    {
      "id": "1585504199191-0",
      "data": {
        "temperature": 25,
        "pressure": 1013.25
      }
    },
    {
      "id": "1585504199195-0",
      "data": {
        "temperature": 15,
        "pressure": 800.45
      }
    }
  ]
}
```

Full type definition: [readstream.ts](src/redstream.ts)