export default (env) => {
  const config = {
    development: () => {
      return { port: 3000, name: 'Nuberoupload' };
    },
    testing: () => {
      return { port: null, name: 'Nuberoupload' };
    },
    staging: () => {
      return { port: 3002, name: 'Nuberoupload' };
    },
    production: () => {
      return { port: 3003, name: 'Nuberoupload' };
    },
  };
  return config[env]();
};
