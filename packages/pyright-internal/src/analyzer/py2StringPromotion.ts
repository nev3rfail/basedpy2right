/* Python 2 compatibility for values supplied to a typed expression. */

import { isPython2 } from '../common/pythonVersion';
import { ParseNode } from '../parser/parseNodes';
import * as AnalyzerNodeInfo from './analyzerNodeInfo';
import { ConstraintTracker } from './constraintTracker';
import { ArgResult, AssignTypeFlags, TypeEvaluator, ValidateArgTypeParams } from './typeEvaluatorTypes';
import { ClassType, isClass, Type } from './types';

const py2StringPromotions = [
    { flag: AssignTypeFlags.Py2StrToUnicode, source: 'str', dest: 'unicode', path: 'str → unicode' },
    { flag: AssignTypeFlags.Py2BytearrayToStr, source: 'bytearray', dest: 'str', path: 'bytearray → str' },
    { flag: AssignTypeFlags.Py2MemoryviewToStr, source: 'memoryview', dest: 'str', path: 'memoryview → str' },
    {
        flag: AssignTypeFlags.Py2BytearrayToUnicode,
        source: 'bytearray',
        dest: 'unicode',
        path: 'bytearray → str → unicode',
    },
    {
        flag: AssignTypeFlags.Py2MemoryviewToUnicode,
        source: 'memoryview',
        dest: 'unicode',
        path: 'memoryview → str → unicode',
    },
];

export function acceptsPy2StringPromotion(dest: ClassType, src: ClassType, flags: AssignTypeFlags): boolean {
    return (
        !(flags & AssignTypeFlags.Invariant) &&
        dest.priv.literalValue === undefined &&
        py2StringPromotions.some(
            (edge) =>
                flags & edge.flag &&
                ClassType.isBuiltIn(dest, edge.dest) &&
                src.shared.mro.some((base) => isClass(base) && ClassType.isBuiltIn(base, edge.source))
        )
    );
}

// Keep ordinary subtype tests (including narrowing, protocols and overload overlap) strict.
// Only a value being supplied to a typed use site can request this retry.
export function tryPy2StringPromotion(
    evaluator: TypeEvaluator,
    node: ParseNode,
    dest: Type,
    src: Type,
    constraints?: ConstraintTracker,
    flags = AssignTypeFlags.Default
): string | undefined {
    if (!isPython2(AnalyzerNodeInfo.getFileInfo(node).executionEnvironment.pythonVersion)) {
        return undefined;
    }

    const tryEdges = (edges: number) => {
        const trial = constraints?.clone();
        return evaluator.assignType(dest, src, undefined, trial, flags | edges) ? { trial } : undefined;
    };
    let enabled: number = AssignTypeFlags.Py2StringPromotions;
    const initial = tryEdges(enabled);
    if (!initial) {
        return undefined;
    }
    let match = initial;
    // Find a sufficient set of actual conversions. Each trial starts with fresh constraints,
    // so unsuccessful union arms cannot contribute evidence or leak TypeVar solutions.
    for (let i = py2StringPromotions.length - 1; i >= 0; i--) {
        const edge = py2StringPromotions[i];
        const reduced = enabled & ~edge.flag;
        const withoutEdge = reduced && tryEdges(reduced);
        if (withoutEdge) {
            enabled = reduced;
            match = withoutEdge;
        }
    }
    if (match.trial && constraints) {
        constraints.copyFromClone(match.trial);
    }
    return py2StringPromotions
        .filter((edge) => enabled & edge.flag)
        .map((edge) => edge.path)
        .join(', ');
}

export function getPy2PromotionNode(param: ValidateArgTypeParams) {
    return param.argument.py2PromotionNode ?? param.argument.valueExpression ?? param.errorNode;
}

export function collectPy2StringPromotions(
    args: ValidateArgTypeParams[],
    results: ArgResult[],
    promotions?: Map<ParseNode, Set<string>>
) {
    for (const [index, result] of results.entries()) {
        if (!result.py2StringPromotion || result.isTypeIncomplete) {
            continue;
        }
        const node = getPy2PromotionNode(args[index]);
        promotions ??= new Map();
        let paths = promotions.get(node);
        if (!paths) {
            paths = new Set();
            promotions.set(node, paths);
        }
        for (const path of result.py2StringPromotion.split(', ')) {
            paths.add(path);
        }
    }
    return promotions;
}
