// TypeQL Grammar (Full PEST format)
// Official grammar from https://github.com/typedb/typeql/blob/master/rust/parser/typeql.pest

export const TYPEQL_GRAMMAR = `
## TypeQL Grammar (PEST Parser Format)

This is the complete formal grammar for TypeQL. Use this to generate syntactically valid queries.

\`\`\`pest
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

eof_query = { SOI ~ query ~ EOI }
query_prefix = { SOI ~ query }
eof_label = { SOI ~ label ~ EOI }
eof_definition_function = { SOI ~ definition_function ~ EOI }
eof_definition_struct = { SOI ~ definition_struct ~ EOI }

// TYPEQL QUERY LANGUAGE =======================================================

query = { query_structure ~ query_end? }
query_structure = { query_schema | query_pipeline_preambled }
query_end = { END ~ SEMICOLON }

// QUERY PIPELINES =============================================================

query_pipeline_preambled = { preamble* ~ query_pipeline }
query_pipeline = { query_stage+ ~ query_stage_terminal? }

preamble = { WITH ~ definition_function }

query_stage = { clause_match | clause_insert | clause_put | clause_update | clause_delete | operator_stream }

query_stage_terminal = { clause_fetch ~ SEMICOLON }

clause_match = { MATCH ~ patterns }

clause_insert = { INSERT ~ patterns }
clause_put = { PUT ~ patterns }
clause_update = { UPDATE ~ patterns }

clause_delete = { DELETE ~ ( ( statement_deletable | pattern_try_deletable ) ~ SEMICOLON )+ }

// STREAM OPERATORS  ===========================================================

operator_stream = { operator_select | operator_sort | operator_distinct | operator_offset | operator_limit | operator_require | operator_reduce }

operator_select = { SELECT ~ vars ~ SEMICOLON }
operator_sort = { SORT ~ var_order ~ ( COMMA ~ var_order )* ~ COMMA? ~ SEMICOLON }
operator_offset = { OFFSET ~ integer_literal ~ SEMICOLON }
operator_limit = { LIMIT ~ integer_literal ~ SEMICOLON }
operator_require = { REQUIRE ~ vars ~ SEMICOLON }
operator_distinct = { DISTINCT ~ SEMICOLON }
operator_reduce = { REDUCE ~ reduce_assign ~ ( COMMA ~ reduce_assign )* ~ COMMA? ~ (GROUPBY ~ vars )? ~ SEMICOLON }

var_order = { var ~ ORDER? }
reduce_assign = { (reduce_assignment_var ~ ASSIGN ~ reducer) }

reduce_assignment_var = { var_optional | var }
reducer = { COUNT ~ ( PAREN_OPEN ~ var ~ PAREN_CLOSE )?
          | MAX ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | MIN ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | MEAN ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | MEDIAN ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | STD ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | SUM ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          | LIST ~ PAREN_OPEN ~ var ~ PAREN_CLOSE
          }

// QUERY PATTERNS ==============================================================

patterns = { ( pattern ~ SEMICOLON )+ }
pattern = { statement | pattern_disjunction | pattern_conjunction | pattern_negation | pattern_try }

pattern_conjunction = { CURLY_OPEN ~ patterns ~ CURLY_CLOSE }
pattern_disjunction = { CURLY_OPEN ~ patterns ~ CURLY_CLOSE ~ ( OR ~ CURLY_OPEN ~ patterns ~ CURLY_CLOSE )+ }
pattern_negation = { NOT ~ CURLY_OPEN ~ patterns ~ CURLY_CLOSE }
pattern_try = { TRY ~ CURLY_OPEN ~ patterns ~ CURLY_CLOSE }

// STATEMENTS ==================================================================

statement = { statement_single | statement_type | statement_thing }

// TYPE STATEMENTS =============================================================

statement_type = { kind ~ type_ref ~ ( COMMA? ~ type_constraint ~ ( COMMA ~ type_constraint )* ~ COMMA? )?
                 | type_ref ~ COMMA? ~ type_constraint ~ ( COMMA ~ type_constraint )* ~ COMMA?
                 }
type_constraint = { type_constraint_base ~ annotations? }
type_constraint_base = { sub_constraint | value_type_constraint | label_constraint
                       | owns_constraint | relates_constraint | plays_constraint
                       }

sub_constraint = { SUB_ ~ type_ref }
value_type_constraint = { VALUE ~ value_type }
label_constraint = { LABEL ~ ( label_scoped | label ) }
owns_constraint = { OWNS ~ type_ref_list | OWNS ~ type_ref }
relates_constraint = { RELATES ~ type_ref_list ~ ( AS ~ type_ref_list )? | RELATES ~ type_ref ~ ( AS ~ type_ref )? }
plays_constraint = { PLAYS ~ type_ref }

// THING STATEMENTS ============================================================

statement_thing = { var ~ COMMA? ~ thing_constraint_list
                  | thing_relation_anonymous ~ (COMMA? ~ thing_constraint_list)?
                  }
thing_relation_anonymous = { type_ref? ~ relation }
thing_constraint_list = {thing_constraint ~ (COMMA ~ thing_constraint)* ~ COMMA?}

thing_constraint = { isa_constraint | iid_constraint | has_constraint | links_constraint }
isa_constraint = { ISA_ ~ type_ref ~ (relation | expression  | value_literal | expression_struct | comparison)? }
iid_constraint = { IID ~ iid_value }
has_constraint = { HAS ~ type_ref_list ~ ( comparison | expression_list | var )
                 | HAS ~ type_ref ~ ( comparison | expression_value | var )
                 | HAS ~ var
                 }
links_constraint = { LINKS ~ relation }

relation = { PAREN_OPEN ~ role_player ~ ( COMMA ~ role_player )* ~ COMMA? ~ PAREN_CLOSE }
role_player = { type_ref_list ~ COLON ~ var | type_ref ~ COLON ~ var | var }

statement_deletable = { HAS? ~ var ~ OF ~ var | LINKS? ~ relation ~ OF ~ var | var }
pattern_try_deletable = { TRY ~ CURLY_OPEN ~ ( statement_deletable ~ SEMICOLON )+ ~ CURLY_CLOSE }

// SINGLE STATEMENTS ===========================================================

statement_single = { statement_is | statement_comparison | statement_assignment | statement_in }

statement_is = { var ~ IS ~ var }
statement_comparison = { expression_value ~ comparison }
statement_assignment = { LET ~ assignment_left ~ ASSIGN ~ expression }
assignment_left = { vars_assignment | struct_destructor }
statement_in = { LET ~ vars_assignment ~ IN ~ ( expression_function | expression_list ) }

vars_assignment = { var_assignment ~ ( COMMA ~ var_assignment )* ~ COMMA? }
var_assignment = { var_optional | var }

comparison = { comparator ~ expression_value }
comparator = { EQ | NEQ | GTE | GT | LTE | LT | CONTAINS | LIKE }

// EXPRESSION CONSTRUCTS =======================================================

expression = { expression_list | expression_value }

expression_value = { expression_base ~ ( expression_operator ~ expression_base )* }
expression_base = { expression_list_index | expression_parenthesis | expression_function | value_literal | var }

expression_operator = _{ POWER | TIMES | DIVIDE | MODULO | PLUS | MINUS }
expression_parenthesis = { PAREN_OPEN ~ expression_value ~ PAREN_CLOSE }

expression_list_index = { var ~ list_index }
list_index = { SQ_BRACKET_OPEN ~ expression_value ~ SQ_BRACKET_CLOSE }

expression_function = { expression_function_name ~ PAREN_OPEN ~ expression_arguments? ~ PAREN_CLOSE }
expression_function_name = { builtin_func_name | identifier }
expression_arguments = { expression ~ ( COMMA ~ expression )* ~ COMMA? }

expression_list = { expression_list_subrange | expression_list_new }
expression_list_new = { SQ_BRACKET_OPEN ~ expression_value ~ ( COMMA ~ expression_value )* ~ COMMA? ~ SQ_BRACKET_CLOSE }
expression_list_subrange = { var ~ list_range }
list_range = { SQ_BRACKET_OPEN ~ expression_value ~ DOUBLE_DOT ~ expression_value ~ SQ_BRACKET_CLOSE }

expression_struct = { CURLY_OPEN ~ struct_key ~ COLON ~ struct_value ~ CURLY_CLOSE }
struct_value = { expression_value | expression_struct }

// FETCH QUERY =================================================================

clause_fetch = { FETCH ~ fetch_object }

fetch_some = { fetch_list | fetch_single | fetch_object }

fetch_object = { CURLY_OPEN ~ fetch_body  ~ CURLY_CLOSE }
fetch_body = { fetch_object_entries | fetch_attributes_all }
fetch_object_entries = { fetch_object_entry ~ ( COMMA ~ fetch_object_entry )* ~ COMMA? }
fetch_object_entry = { fetch_key ~ COLON ~ fetch_some }
fetch_key = { quoted_string_literal }

fetch_list = { SQ_BRACKET_OPEN ~ fetch_stream ~ SQ_BRACKET_CLOSE }
fetch_stream = { expression_function | function_block | query_pipeline | fetch_attribute }
fetch_single = { PAREN_OPEN? ~ ( fetch_attribute | expression | function_block ) ~ PAREN_CLOSE? }

fetch_attribute = { var_named ~ DOT ~ ( label_list | label ) }
fetch_attributes_all = { var_named ~ DOT ~ STAR }

// SCHEMA QUERY ================================================================

query_schema = { query_define | query_undefine | query_redefine }
query_define = { DEFINE ~ definables }
query_undefine = { UNDEFINE ~ undefinables }
query_redefine = { REDEFINE ~ ( redefinable )* }

// TYPE, LABEL AND IDENTIFIER CONSTRUCTS =======================================

type_ref = { label_scoped | label | var }
type_ref_list = { type_ref ~ SQ_BRACKET_OPEN ~ SQ_BRACKET_CLOSE }

named_type = { value_type_primitive | label }
named_type_optional = { named_type ~ QUESTION }
named_type_list = { named_type ~ SQ_BRACKET_OPEN ~ SQ_BRACKET_CLOSE }
named_type_any = { named_type_optional | named_type_list | named_type }

label = \${ identifier }
label_list = { label ~ SQ_BRACKET_OPEN ~ SQ_BRACKET_CLOSE }
label_scoped = \${ label ~ COLON ~ label ~ WB }

identifier = @{ !reserved ~ IDENTIFIER_LABEL_H ~ IDENTIFIER_LABEL_T* ~ WB }
struct_key = { identifier }
iid_value = @{ "0x" ~ ASCII_HEX_DIGIT+ ~ WB }

// VARIABLES ===================================================================

vars = { var ~ ( COMMA ~ var )* ~ COMMA? }

var = \${ VAR_ANONYMOUS | var_named }
var_optional = \${ var ~ QUESTION }

VAR_ANONYMOUS = @{ "\$_" ~ WB }
var_named = \${ "\$" ~ identifier_var }
identifier_var = @{ IDENTIFIER_VAR_H ~ IDENTIFIER_VAR_T* ~ WB }

// VALUES ======================================================================

value_type = { value_type_primitive | label }
value_type_optional = { value_type ~ QUESTION }
value_type_list = { value_type ~ SQ_BRACKET_OPEN ~ SQ_BRACKET_CLOSE }

value_type_primitive = { BOOLEAN | INTEGER | DOUBLE | DECIMAL
                       | DATETIME_TZ | DATETIME | DATE | DURATION
                       | STRING
                       }
value_literal = { quoted_string_literal | datetime_tz_literal | datetime_literal | date_literal
                | duration_literal | boolean_literal | signed_decimal | signed_double | signed_integer
                }

signed_decimal = { sign? ~ decimal_literal }
signed_double = { sign? ~ double_literal }
signed_integer = { sign? ~ integer_literal }
sign = { PLUS | MINUS }

// ANNOTATIONS =================================================================

annotations = { annotation+ }
annotation = { ANNOTATION_ABSTRACT | ANNOTATION_CASCADE | ANNOTATION_DISTINCT
             | ANNOTATION_INDEPENDENT | ANNOTATION_KEY | ANNOTATION_UNIQUE
             | annotation_card | annotation_range | annotation_regex
             | annotation_subkey | annotation_values
             }

// TYPEQL SYNTAX KEYWORDS ======================================================

reserved = { WITH | MATCH | FETCH | UPDATE | DEFINE | UNDEFINE | REDEFINE | INSERT | PUT | DELETE | END
           | ENTITY | RELATION | ATTRIBUTE | ROLE
           | ASC | DESC
           | STRUCT | FUN | RETURN
           | ALIAS | SUB | OWNS | AS | PLAYS | RELATES
           | IID | ISA | LINKS | HAS
           | IS | OR | NOT | TRY | IN
           | TRUE | FALSE
           | OF | FROM
           | FIRST | LAST
           }

// QUERY COMMAND KEYWORDS

WITH = @{ "with" ~ WB }
MATCH = @{ "match" ~ WB }
FETCH = @{ "fetch" ~ WB }
DEFINE = @{ "define" ~ WB }
UNDEFINE = @{ "undefine" ~ WB }
REDEFINE = @{ "redefine" ~ WB }
INSERT = @{ "insert" ~ WB }
PUT = @{ "put" ~ WB }
UPDATE = @{ "update" ~ WB }
DELETE = @{ "delete" ~ WB }

REDUCE = @{ "reduce" ~ WB }
CHECK = @{ "check" ~ WB }
FIRST = @{ "first" ~ WB }
LAST = @{ "last" ~ WB }
GROUPBY = @{ "groupby" ~ WB }
END = @{ "end" ~ WB }

// THING KIND KEYWORDS

kind = { ENTITY | ATTRIBUTE | RELATION }
ENTITY = @{ "entity" ~ WB }
ATTRIBUTE = @{ "attribute" ~ WB }
RELATION = @{ "relation" ~ WB }
ROLE = @{ "role" ~ WB }

// QUERY MODIFIER KEYWORDS

SELECT = @{ "select" ~ WB }
LIMIT = @{ "limit" ~ WB }
OFFSET = @{ "offset" ~ WB }
SORT = @{ "sort" ~ WB }
REQUIRE = @{ "require" ~ WB }
DISTINCT = @{ "distinct" ~ WB }

ORDER = \${ ASC | DESC }
ASC = @{ "asc" ~ WB }
DESC = @{ "desc" ~ WB }

// FUNCTION KEYWORDS

FUN = @{ "fun" ~ WB }
RETURN = @{ "return" ~ WB }

// TYPE VARIABLE CONSTRAINT KEYWORDS

ALIAS = @{ "alias" ~ WB }
AS = @{ "as" ~ WB }
FROM = @{ "from" ~ WB }
LABEL = @{ "label" ~ WB }
OF = @{ "of" ~ WB }
OWNS = @{ "owns" ~ WB }
PLAYS = @{ "plays" ~ WB }
RELATES = @{ "relates" ~ WB }
SUB_ = \${ SUBX | SUB }
SUB = @{ "sub" ~ WB }
SUBX = @{ "sub!" ~ WB }

// TYPE ANNOTATIONS

ANNOTATION_ABSTRACT = @{ "@abstract" ~ WB }
ANNOTATION_CASCADE = @{ "@cascade" ~ WB }
ANNOTATION_DISTINCT = @{ "@distinct" ~ WB }
ANNOTATION_KEY = @{ "@key" ~ WB }
ANNOTATION_INDEPENDENT = @{ "@independent" ~ WB }
ANNOTATION_UNIQUE = @{ "@unique" ~ WB }
ANNOTATION_CARD = @{ "@card" ~ WB }
ANNOTATION_RANGE = @{ "@range" ~ WB }
ANNOTATION_REGEX = @{ "@regex" ~ WB }
ANNOTATION_SUBKEY = @{ "@subkey" ~ WB }
ANNOTATION_VALUES = @{ "@values" ~ WB }

// THING VARIABLE CONSTRAINT KEYWORDS

IID = @{ "iid" ~ WB }
ISA_ = \${ ISAX | ISA }
ISA = @{ "isa" ~ WB }
ISAX = @{ "isa!" ~ WB }
LINKS = @{ "links" ~ WB }
HAS = @{ "has" ~ WB }
VALUE = @{ "value" ~ WB }
IS = @{ "is" ~ WB }

// PATTERN KEYWORDS

OR = @{ "or" ~ WB }
NOT = @{ "not" ~ WB }
TRY = @{ "try" ~ WB }

// COMPARATOR KEYWORDS

EQ = @{ "==" }
NEQ = @{ "!=" }
GT = @{ ">" }
GTE = @{ ">=" }
LT = @{ "<" }
LTE = @{ "<=" }
LIKE = @{ "like" ~ WB }
CONTAINS = @{ "contains" ~ WB }

// ASSIGNMENT AND EXPRESSION KEYWORDS

LET = @{ "let" }
ASSIGN = @{ "=" }
IN = @{ "in" ~ WB }

PLUS = @{ "+" }
MINUS = @{ "-" }
TIMES = @{ "*" }
DIVIDE = @{ "/" }
POWER = @{ "^" }
MODULO = @{ "%" }

// FUNCTION NAMES

builtin_func_name = \${ ABS | CEIL | FLOOR | ROUND | LENGTH | MAX | MIN }
ABS = @{ "abs" ~ WB }
CEIL = @{ "ceil" ~ WB }
FLOOR = @{ "floor" ~ WB }
LENGTH = @{ "length" ~ WB }
ROUND = @{ "round" ~ WB }

// AGGREGATE KEYWORDS

GROUP = @{ "group" ~ WB }
COUNT = @{ "count" ~ WB }
MAX = @{ "max" ~ WB }
MIN = @{ "min" ~ WB }
MEAN = @{ "mean" ~ WB }
MEDIAN = @{ "median" ~ WB }
STD = @{ "std" ~ WB }
SUM = @{ "sum" ~ WB }
LIST = @{ "list" ~ WB }

// VALUE TYPE KEYWORDS

BOOLEAN = @{ "boolean" ~ WB }
INTEGER = @{ "integer" ~ WB }
DOUBLE = @{ "double" ~ WB }
DECIMAL = @{ "decimal" ~ WB }
DATE = @{ "date" ~ WB }
DATETIME = @{ "datetime" ~ WB }
DATETIME_TZ = @{ "datetime-tz" ~ WB }
DURATION = @{ "duration" ~ WB }
STRING = @{ "string" ~ WB }
STRUCT = @{ "struct" ~ WB }

// LITERAL VALUES

boolean_literal = \${ TRUE | FALSE }
TRUE = @{ "true" ~ WB }
FALSE = @{ "false" ~ WB }

integer_literal = @{ ASCII_DIGIT+ }
decimal_literal = @{ ASCII_DIGIT+ ~ "." ~ ASCII_DIGIT+ ~ "dec" }
double_literal = @{ ASCII_DIGIT+ ~ "." ~ ASCII_DIGIT+ ~ ( ^"e" ~ sign? ~ integer_literal )? }
numeric_literal = @{ double_literal | integer_literal }

date_literal = \${ date_fragment ~ WB }
datetime_literal = \${ date_fragment ~ "T" ~ time ~ WB }
datetime_tz_literal = \${ date_fragment ~ "T" ~ time ~ ( " " ~ iana_timezone | iso8601_timezone_offset ) ~ WB }
duration_literal = \${ "P" ~ ( duration_weeks | duration_date ~ ( "T" ~ duration_time )? | "T" ~ duration_time ) ~ WB}

quoted_string_literal = @{ "\\"" ~ ( !"\\"" ~ !"\\\\\\\\\\\\\\\" ~ ANY | escape_seq )* ~ "\\""
                         | "'" ~ ( !"'" ~ !"\\\\\\\\\\\\\\\" ~ ANY | escape_seq )* ~ "'" }

// PUNCTUATION =================================================================

PAREN_OPEN = _{ "(" }
PAREN_CLOSE = _{ ")" }
SQ_BRACKET_OPEN = _{ "[" }
SQ_BRACKET_CLOSE = _{ "]" }
CURLY_OPEN = _{ "{" }
CURLY_CLOSE = _{ "}" }
STAR = _{ "*" }
COMMA = _{ "," }
SEMICOLON = _{ ";" }
COLON = _{ ":" }
DOT = _{ "." }
DOUBLE_DOT = _{ ".." }
QUESTION = _{ "?" }
ARROW = _{ "->" }

// IDENTIFIER FRAGMENTS

IDENTIFIER_START = @{ XID_START }
IDENTIFIER_CONTINUE = @{ "-" | XID_CONTINUE }
IDENTIFIER_LABEL_H = @{ IDENTIFIER_START }
IDENTIFIER_LABEL_T = @{ IDENTIFIER_CONTINUE }
IDENTIFIER_VAR_H = @{ IDENTIFIER_START | ASCII_DIGIT }
IDENTIFIER_VAR_T = @{ IDENTIFIER_CONTINUE }

WB = _{ !IDENTIFIER_CONTINUE }  // Word boundary
COMMENT = _{ "#" ~ ( !NEWLINE ~ ANY )* ~ ( NEWLINE | EOI ) }
WHITESPACE = _{ " " | "\\t" | "\\r" | "\\n" }
\`\`\`
`;
