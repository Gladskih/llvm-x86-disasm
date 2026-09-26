"""Extract resolved LLVM predicates. Unknown structured expressions fail closed."""
import json
import pathlib
import sys


def expression(node, feature_names):
    if node["kind"] == "def":
        assert node["def"] in feature_names, node["def"]
        return {"feature": node["def"]}
    assert node["kind"] == "dag", node
    operator = node["operator"]["def"]
    assert operator in ("all_of", "any_of", "not"), node
    arguments = [expression(argument[0], feature_names) for argument in node["args"]]
    if operator == "not":
        assert len(arguments) == 1
        return {"not": arguments[0]}
    if not arguments:
        return operator == "all_of"
    return arguments[0] if len(arguments) == 1 else {operator: arguments}


def instruction_requirements(record, records, feature_names):
    predicates, non_assembler = [], []
    for reference in record["Predicates"]:
        predicate = records[reference["def"]]
        if predicate["AssemblerMatcherPredicate"]:
            predicates.append({"name": reference["def"], "expression":
                               expression(predicate["AssemblerCondDag"], feature_names)})
        else:
            non_assembler.append({"name": reference["def"],
                                  "condition": predicate["CondString"]})
    return {"predicates": predicates, "nonAssemblerPredicates": non_assembler}


def opcode_metadata(records, feature_names):
    requirements, indices, opcodes = [], {}, {}
    for name in sorted(records["!instanceof"]["Instruction"]):
        record = records[name]
        if record.get("Namespace") != "X86" or record.get("isPseudo"):
            continue
        requirement = instruction_requirements(record, records, feature_names)
        key = json.dumps(requirement, sort_keys=True)
        if key not in indices:
            indices[key] = len(requirements)
            requirements.append(requirement)
        opcodes[name] = indices[key]
    return {"requirements": requirements, "opcodes": opcodes}


def feature_metadata(records, feature_names):
    return {name: {
        "llvmName": records[name]["Name"],
        "description": records[name]["Desc"],
        "llvmField": records[name]["FieldName"],
        "implies": [reference["def"] for reference in records[name]["Implies"]],
    } for name in sorted(feature_names)}


def generate(records):
    assert records["!tablegen_json_version"] == 1
    feature_names = set(records["!instanceof"]["SubtargetFeature"])
    return {"features": feature_metadata(records, feature_names),
            **opcode_metadata(records, feature_names)}


if __name__ == "__main__":
    result = generate(json.loads(pathlib.Path(sys.argv[1]).read_text()))
    output = pathlib.Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("// Generated from pinned LLVM; Apache-2.0 WITH LLVM-exception.\n"
                      "export default " + json.dumps(result, separators=(",", ":"),
                                                     sort_keys=True) + ";\n")
    print("Generated", len(result["opcodes"]), "opcodes and",
          len(result["requirements"]), "predicate sets")
