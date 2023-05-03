const path = require('path');
const { readFileSync } = require('fs');

module.exports = function (
    i
) {
    /** @type {import('plop').NodePlopAPI} */
    const plop = i;

    plop.setGenerator('utility-lib', {
        description: 'Create a new utility library',
        prompts: [
            {
                type: "input",
                name: "name",
                message: "Enter the name of your utility library",
            }
        ],
        actions: () => {
            return [
                {
                    type: "addMany",
                    destination: "packages/{{name}}",
                    base: "plop_templates/utility-lib",
                    templateFiles: "plop_templates/utility-lib/**/*",
                    globOptions: {dot: true}
                }
            ]
        }
    })
};
