# InternMatch demonstration

Before presenting, start FastAPI on port 8000 and Vite on port 3000. Create an admin with `python -m backend.create_admin`. Use separate browser profiles for student and admin sessions when demonstrating both roles. The original seeded internships are sample listings.

## Admin publishing

Sign in as admin. Open Manage internships, complete the internship form, and publish an opportunity. Show that branch, CGPA, skill, interest, date, and opening fields are validated. Edit an existing opportunity if useful. Removing a listing requires confirming the removal.

## Admin account settings

Show the Admin account form. Explain that changing the name, email, or password requires the current password. Leave the new password blank if only updating the name. Saving signs out other sessions.

## Student registration and profile

Register a student account and complete the profile form. Explain that accounts and profiles are stored by the backend and can be used after signing in again. No hard-coded student profile is loaded.

## Recommendations and discovery

Open For you to show eligible internships matching the saved skills or interests. Open Internships to search, filter, compare roles, and inspect their eligibility details. The admin-published opportunity becomes visible when the catalog refreshes (focus the window or wait up to 30 seconds).

## Graph and progress

Open Graph view and inspect connections between the student, skills, interests, companies, and internships. Show NetworkX metrics when the service is available. Save an internship and update an application tracker stage. Tracker progress and notes are stored separately for each account in this browser; they do not submit employer applications.

## Scope

Student registration does not grant admin permissions. Passwords are hashed, sessions expire after eight hours, and backend authorization protects all catalog changes. The platform does not use a live internship API or a trained hiring model.
