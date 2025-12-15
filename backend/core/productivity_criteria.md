# Productivity Criteria

This document explains how the system determines a user's productivity level.

## Criteria Used

The system evaluates productivity based on the following criteria:

1. **Task Completion Rate**
   - The percentage of planned tasks that the user completes within a given period (e.g., daily, weekly, monthly).
2. **Consistency**
   - The user's regular engagement with tasks (e.g., working on tasks daily or on most days).
3. **Meeting Deadlines**
   - Completing tasks on or before their due dates.
4. **Time Spent on Productive Activities**
   - The amount of time logged or spent on activities classified as productive (if tracked).

## Productivity Scale

The system uses a four-level productivity scale based on the user's task completion rate:

| Status               | Completion Rate (%) |
|----------------------|--------------------|
| Highly Productive    | 90–100             |
| Productive           | 70–89.99           |
| Moderately Productive| 40–69.99           |
| Low Productivity     | 0–39.99            |

- **Highly Productive:** Completion rate is 90% or higher.
- **Productive:** Completion rate is between 70% and 89.99%.
- **Moderately Productive:** Completion rate is between 40% and 69.99%.
- **Low Productivity:** Completion rate is below 40%.

## Example Calculation

- If a user plans 20 tasks in a week and completes 19:
  - Task Completion Rate = 19 / 20 = 95%
  - The user is **Highly Productive**.

- If a user plans 20 tasks and completes 15:
  - Task Completion Rate = 15 / 20 = 75%
  - The user is **Productive**.

- If a user plans 20 tasks and completes 10:
  - Task Completion Rate = 10 / 20 = 50%
  - The user is **Moderately Productive**.

- If a user plans 20 tasks and completes 5:
  - Task Completion Rate = 5 / 20 = 25%
  - The user has **Low Productivity**.

## Transparency

These criteria and thresholds are shown to users in the Progress section of the app to ensure clarity and transparency.

## Academic Support

This productivity tracking methodology is supported by academic research and established frameworks:

- **Goal-Setting Theory** (Locke & Latham, 1990): Validates task completion as a productivity metric
- **Getting Things Done Framework** (Allen, 2001): Supports task management and deadline adherence
- **Performance Management Research**: Four-tier classification aligns with performance rating systems
- **Gamification Research**: Visual progress indicators and achievement tracking improve motivation

For detailed literature review and academic references, see:
- `productivity_literature_review.md` - Comprehensive academic literature review
- `productivity_literature_summary.md` - Quick reference summary

---

*For questions or suggestions about these criteria, please contact the development team.* 