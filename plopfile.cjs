module.exports = async function (
    i
) {
    /** @type {import('plop').NodePlopAPI} */
    const plop = i;

    const args = process.argv.slice(2);
    await plop.load("@nrfcloud/templates", {force: args.includes("-f") || args.includes("--force")})
};
