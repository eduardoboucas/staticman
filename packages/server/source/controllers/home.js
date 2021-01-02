import pkg from '../../package.json';

export default (req, res) => {
  res.send(`Hello from Staticman version ${pkg.version}!`);
};
