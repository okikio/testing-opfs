const isWorker =
  typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

async function getHandleFromPath(path: string) {
  const pathParts = path.split('/').filter((part) => part.length > 0);
  let currentHandle = await navigator.storage.getDirectory();

  for (const part of pathParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      currentHandle = await currentHandle.getParent();
    } else {
      currentHandle = await currentHandle.getDirectoryHandle(part, {
        create: true,
      });
    }
  }

  return currentHandle;
}

async function getFileHandleFromPath(path: string) {
  const pathParts = path.split('/').filter((part) => part.length > 0);
  const fileName = pathParts.pop();
  const dirHandle = await getHandleFromPath(pathParts.join('/'));

  console.log({
    dirHandle,
  });
  return await dirHandle.getFileHandle(fileName, {
    create: true,
  });
}

export const FS = {
  writeFile: async (
    fileName: string,
    binaryData: Uint8Array | string
  ): Promise<void> => {
    const fileHandle = await getFileHandleFromPath(fileName);
    const accessHandle = await getFileAccessHandle(fileHandle);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(binaryData);

    if (isWorker) {
      accessHandle.write(encodedData, { at: 0 });
      accessHandle.flush();
      accessHandle.close();
    } else {
      await accessHandle.write(encodedData);
      await accessHandle.close();
    }
  },

  readFile: async (fileName: string): Promise<Uint8Array> => {
    const fileHandle = await getFileHandleFromPath(fileName);
    const accessHandle = await getFileAccessHandle(fileHandle);

    let fileSize;
    let buffer;

    if (isWorker) {
      fileSize = accessHandle.getSize();
      buffer = new DataView(new ArrayBuffer(fileSize));
      accessHandle.read(buffer, { at: 0 });
      accessHandle.close();
    } else {
      const file = await fileHandle.getFile();
      fileSize = file.size;
      buffer = new Uint8Array(fileSize);
      await file.arrayBuffer().then((data) => buffer.set(new Uint8Array(data)));
    }

    return new Uint8Array(buffer.buffer);
  },

  readdir: async (pathName: string): Promise<string[]> => {
    const dirHandle = await getHandleFromPath(pathName);
    const entries = [];
    for await (const entry of dirHandle.values()) {
      entries.push(entry.name);
    }
    return entries;
  },

  // Update the unlink function
  unlink: async (fileName: string): Promise<void> => {
    const fileHandle = await getFileHandleFromPath(fileName);
    await fileHandle.removeEntry(fileName);
  },

  mkdir: async (fileName: string): Promise<void> => {
    await getHandleFromPath(fileName);
  },
};

export default FS;
