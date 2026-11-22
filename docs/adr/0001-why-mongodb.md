# ADR 0001 · Use MongoDB and Mongoose

**Status** · Accepted for this capstone.

The assignment requires MongoDB and Mongoose. Reference documents fit the relationships among people, courses, sections and enrolments. Embedding attendance marks and corrections in the same session document gives atomic class-level updates. Aggregations produce attendance percentages and section or course enrolment counts.

The approach requires explicit reference validation and appropriate indexes. Academic writes are serialized within the first-release API process because the demo uses a standalone local MongoDB instance.
