import FS from './opfs';

const path = '/cool/what/do/you/mean.js';
await FS.writeFile(path, 'What!!!!');

console.log({
  fileData: new TextDecoder().decode(await FS.readFile(path)),
});
