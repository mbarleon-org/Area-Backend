/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** current_date.ts
*/

module.exports = {
    spec: {
        id: 'current_date',
        pretty_name: 'Current Date Check',
        description: 'Triggers when current date matches DD/MM format',
        inputs: [
            { id: 'date_pattern', pretty_name: 'Date Pattern (DD/MM)', type: 'string', required: true }
        ],
        outputs: [
            { id: 'matched', pretty_name: 'Date Matched', type: 'boolean' },
            { id: 'current_date', pretty_name: 'Current Date', type: 'string' }
        ]
    },
    handler: async (ctx, inputs) => {
        const today = new Date();
        const pattern = inputs.date_pattern; // "25/12" for Christmas
        const formatted = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}`;
        return {
            matched: formatted === pattern,
            current_date: formatted
        };
    }
};
