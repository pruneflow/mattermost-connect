import { shallowEqual } from "react-redux";

function getDependencies(funcs) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;

  if (!dependencies.every((dep) => typeof dep === 'function')) {
    const dependencyTypes = dependencies.map(
      (dep) => typeof dep,
    ).join(', ');
    throw new Error(
      'Selector creators expect all input-selectors to be functions, ' +
      `instead received the following types: [${dependencyTypes}]`,
    );
  }

  return dependencies;
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
  return (name, ...funcs) => {
    const resultFunc = funcs.pop();
    const dependencies = getDependencies(funcs);

    const memoizedResultFunc = memoize(
      function() {
        // apply arguments instead of spreading for performance.
        return resultFunc?.apply(null, arguments);
      },
      ...memoizeOptions,
    );

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    const selector = memoize(function() {
      const params = [];
      const length = dependencies.length;

      for (let i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        params.push(dependencies[i].apply(null, arguments));
      }

      // apply arguments instead of spreading for performance.
      return memoizedResultFunc.apply(null, params);
    });

    selector.resultFunc = resultFunc;
    selector.dependencies = dependencies;

    return selector;
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function memoizeResult(func, measure) {
  let lastArgs = null;
  let lastResult = null;

  // we reference arguments instead of spreading them for performance reasons
  return function memoizedFunc() {
    if (!shallowEqual(lastArgs, arguments)) { //eslint-disable-line prefer-rest-params
      //eslint-disable-line prefer-rest-params
      // apply arguments instead of spreading for performance.
      const result = Reflect.apply(func, null, arguments); //eslint-disable-line prefer-rest-params
      if (!shallowEqual(lastResult, result)) {
        lastResult = result;
      }
    }

    if (measure) {
      measure();
    }

    lastArgs = arguments; //eslint-disable-line prefer-rest-params
    return lastResult;
  } ;
}

// Use this selector when you want a shallow comparison of the arguments and you want to memoize the result
// try and use this only when your selector returns an array of ids
export const createIdsSelector = createSelectorCreator(memoizeResult);