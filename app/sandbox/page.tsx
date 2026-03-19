export default function Sandbox() {
  const ls = globalThis.localStorage as any;
  const info = {
    hasLocalStorage: typeof ls !== 'undefined',
    type: typeof ls,
    setItemType: ls ? typeof ls.setItem : 'undefined',
    getItemType: ls ? typeof ls.getItem : 'undefined',
    isObject: ls !== null && typeof ls === 'object'
  };
  
  // Also try to call setItem to see if it throws
  let setItemError = null;
  if (ls && typeof ls === 'object') {
    try {
      ls.setItem('test', 'test');
    } catch (e: any) {
      setItemError = e.message;
    }
  }

  return <pre>{JSON.stringify({ ...info, setItemError }, null, 2)}</pre>;
}
