import processEntry from './processEntry';

const processEntryFactory = (configParameters) => {
  return (...args) => processEntry.apply(this, [configParameters, ...args]);
};

// eslint-disable-next-line import/prefer-default-export
export { processEntryFactory as processEntry };
