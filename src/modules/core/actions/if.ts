module.exports = {
    spec: {
        id: 'if',
        pretty_name: 'If / Condition',
        description: 'Evaluate a simple condition against a value',
        inputs: [
            { id: 'value', pretty_name: 'Value', type: 'string', required: true },
            {
                id: 'operator', pretty_name: 'Operator', type: 'select', required: true, options: [
                    { label: 'equals', value: 'equals' },
                    { label: 'contains', value: 'contains' },
                    { label: 'starts_with', value: 'starts_with' },
                    { label: 'ends_with', value: 'ends_with' },
                    { label: 'matches_regex', value: 'matches_regex' }
                ]
            },
            { id: 'pattern', pretty_name: 'Pattern', type: 'string', required: true },
            { id: 'case_insensitive', pretty_name: 'Case insensitive', type: 'boolean', required: false }
        ],
        outputs: [
            { id: 'result', pretty_name: 'Result', type: 'boolean' }
        ]
    },

    handler: async function (_ctx: any, inputs: any) {
        const value = inputs.value ?? '';
        const op = inputs.operator || 'equals';
        const pattern = inputs.pattern ?? '';
        const ci = !!inputs.case_insensitive;

        let res = false;
        try {
            if (op === 'equals') {
                if (ci) res = String(value).toLowerCase() === String(pattern).toLowerCase();
                else res = String(value) === String(pattern);
            } else if (op === 'contains') {
                if (ci) res = String(value).toLowerCase().indexOf(String(pattern).toLowerCase()) !== -1;
                else res = String(value).indexOf(String(pattern)) !== -1;
            } else if (op === 'starts_with') {
                if (ci) res = String(value).toLowerCase().startsWith(String(pattern).toLowerCase());
                else res = String(value).startsWith(String(pattern));
            } else if (op === 'ends_with') {
                if (ci) res = String(value).toLowerCase().endsWith(String(pattern).toLowerCase());
                else res = String(value).endsWith(String(pattern));
            } else if (op === 'matches_regex') {
                const flags = ci ? 'i' : '';
                const rx = new RegExp(pattern, flags);
                res = rx.test(String(value));
            }
        } catch (e) {
            res = false;
        }

        return { result: !!res };
    }
};
