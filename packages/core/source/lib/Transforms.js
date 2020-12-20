import md5Lib from 'md5';

export const md5 = (value) => {
  return md5Lib(value);
};

export const upcase = (value) => {
  return String(value).toUpperCase();
};

export const downcase = (value) => {
  return String(value).toLowerCase();
};
