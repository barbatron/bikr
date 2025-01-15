import { useEffect, useState } from "preact/hooks";
import { Observable } from "rxjs";

export const useObservable = <T>(observable: Observable<T>, initial: T) => {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const subscription = observable.subscribe((value) => void setValue(value));
    return () => subscription.unsubscribe();
  }, [observable]);
  return value;
};
