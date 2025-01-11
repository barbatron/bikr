import { useEffect, useState } from "preact/hooks";
import { Observable } from "rxjs";

export const useObservable = <T>(observable: Observable<T>) => {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = observable.subscribe((value) => void setValue(value));
    return () => subscription.unsubscribe();
  }, [observable]);
  return value;
};
