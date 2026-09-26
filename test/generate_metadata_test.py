import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("metadata", pathlib.Path(__file__).parents[1]
                                             / "scripts/generate-metadata.py")
metadata = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metadata)


def feature(name="FeatureTest"):
    return {"kind": "def", "def": name}


def dag(operator, *arguments):
    return {"kind": "dag", "operator": {"def": operator},
            "args": [[argument, None] for argument in arguments]}


def records():
    return {
        "!tablegen_json_version": 1,
        "!instanceof": {"SubtargetFeature": ["FeatureTest"],
                        "Instruction": ["TEST", "OTHER", "PSEUDO", "DUPLICATE"]},
        "FeatureTest": {"Name": "test", "Desc": "Test feature", "FieldName": "HasTest",
                        "Implies": []},
        "TEST": {"Namespace": "X86", "Predicates": [feature("HasTest")]},
        "DUPLICATE": {"Namespace": "X86", "Predicates": [feature("HasTest")]},
        "OTHER": {"Namespace": "Other", "Predicates": []},
        "PSEUDO": {"Namespace": "X86", "isPseudo": 1, "Predicates": []},
        "HasTest": {"AssemblerMatcherPredicate": 0, "CondString": "Subtarget->hasTest()"},
    }


class MetadataTests(unittest.TestCase):
    def test_feature_reference(self):
        self.assertEqual(metadata.expression(feature(), {"FeatureTest"}),
                         {"feature": "FeatureTest"})

    def test_unknown_feature(self):
        with self.assertRaises(AssertionError):
            metadata.expression(feature("unknown"), {"FeatureTest"})

    def test_any_and_all_of(self):
        self.assertEqual(metadata.expression(dag("all_of", feature()), {"FeatureTest"}),
                         {"feature": "FeatureTest"})
        self.assertEqual(metadata.expression(dag("any_of", feature(), feature()),
                                             {"FeatureTest"}),
                         {"any_of": [{"feature": "FeatureTest"}, {"feature": "FeatureTest"}]})
        self.assertEqual(metadata.expression(dag("all_of"), set()), True)
        self.assertEqual(metadata.expression(dag("any_of"), set()), False)

    def test_not(self):
        self.assertEqual(metadata.expression(dag("not", feature()), {"FeatureTest"}),
                         {"not": {"feature": "FeatureTest"}})
        with self.assertRaises(AssertionError):
            metadata.expression(dag("not"), set())

    def test_unknown_expression(self):
        with self.assertRaises(AssertionError):
            metadata.expression(dag("unsupported"), set())
        with self.assertRaises(AssertionError):
            metadata.expression({"kind": "unexpected"}, set())

    def test_filters_and_deduplicates_requirements(self):
        result = metadata.generate(records())
        self.assertEqual(result["opcodes"], {"DUPLICATE": 0, "TEST": 0})
        self.assertEqual(result["requirements"], [{"predicates": [],
                         "nonAssemblerPredicates": [{"name": "HasTest",
                         "condition": "Subtarget->hasTest()"}]}])
        self.assertEqual(result["features"]["FeatureTest"]["llvmField"], "HasTest")

    def test_assembler_predicate(self):
        source = records()
        source["HasTest"].update(AssemblerMatcherPredicate=1,
                                 AssemblerCondDag=dag("all_of", feature()))
        self.assertEqual(metadata.generate(source)["requirements"][0]["predicates"],
                         [{"name": "HasTest", "expression": {"feature": "FeatureTest"}}])

    def test_unknown_schema(self):
        source = records()
        source["!tablegen_json_version"] = 2
        with self.assertRaises(AssertionError):
            metadata.generate(source)

    def test_truncated_record(self):
        source = records()
        del source["HasTest"]
        with self.assertRaises(KeyError):
            metadata.generate(source)
