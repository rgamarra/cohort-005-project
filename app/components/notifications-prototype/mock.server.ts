// PROTOTYPE — throwaway. Lives on branch prototype/in-app-notifications-ui only.
// Builds in-memory sample Notifications for the current user, using the list
// decided in "Which notifications, for whom" (issue #6). No provider, no DB writes.
import { eq, ne } from "drizzle-orm";
import { db } from "~/db";
import { courses, users, UserRole, CourseStatus } from "~/db/schema";

export type ProtoNotification = {
  id: string;
  row: number; // row in the decided list (1–10)
  text: string;
  href: string;
  actionable: boolean; // ★ in the list
  minutesAgo: number;
  read: boolean;
};

type Template = Omit<ProtoNotification, "id" | "minutesAgo" | "read">;

export function getPrototypeNotifications(
  currentUser: { id: number; role: UserRole } | null,
  isTeamAdmin: boolean
): { initial: ProtoNotification[]; pool: Template[] } {
  if (!currentUser) return { initial: [], pool: [] };

  const others = db
    .select({ name: users.name })
    .from(users)
    .where(ne(users.id, currentUser.id))
    .limit(6)
    .all()
    .map((u) => u.name);
  const person = (i: number) => others[i % Math.max(others.length, 1)] ?? "Sam Lee";

  const ownCourses =
    currentUser.role === UserRole.Instructor
      ? db
          .select({ id: courses.id, title: courses.title, slug: courses.slug })
          .from(courses)
          .where(eq(courses.instructorId, currentUser.id))
          .limit(3)
          .all()
      : [];
  const anyCourses = db
    .select({ id: courses.id, title: courses.title, slug: courses.slug })
    .from(courses)
    .where(eq(courses.status, CourseStatus.Published))
    .limit(3)
    .all();
  const pick = ownCourses.length ? ownCourses : anyCourses;
  const course = (i: number) =>
    pick[i % Math.max(pick.length, 1)] ?? { id: 1, title: "React Basics", slug: "" };
  const coursePage = (i: number) =>
    course(i).slug ? `/courses/${course(i).slug}` : "/courses";

  let templates: Template[] = [];
  if (currentUser.role === UserRole.Admin) {
    templates = [
      { row: 1, actionable: true, text: `${person(0)} requested a refund for ${course(0).title}`, href: "/admin/refunds" },
      { row: 4, actionable: true, text: `Refund to ${person(1)} for ${course(1).title} failed`, href: "/admin/refunds" },
      { row: 1, actionable: true, text: `${person(2)} requested a refund for ${course(2).title}`, href: "/admin/refunds" },
    ];
  } else if (currentUser.role === UserRole.Instructor) {
    templates = [
      { row: 7, actionable: true, text: `${person(0)} commented on "Setting up your editor" in ${course(0).title}`, href: "/instructor/questions" },
      { row: 8, actionable: false, text: `${person(1)} enrolled on ${course(0).title}`, href: `/instructor/${course(0).id}/students` },
      { row: 9, actionable: false, text: `${person(2)} rated ${course(1).title} 4★`, href: "/instructor/analytics" },
      { row: 6, actionable: false, text: `${person(3)} replied to your comment on "Hooks in depth"`, href: coursePage(0) },
    ];
  } else {
    templates = [
      { row: 6, actionable: false, text: `${person(0)} replied to your comment on "Hooks in depth"`, href: coursePage(0) },
      { row: 3, actionable: false, text: `Your refund for ${course(1).title} has been issued`, href: coursePage(1) },
      { row: 2, actionable: false, text: `Your refund request for ${course(1).title} was approved`, href: coursePage(1) },
      { row: 10, actionable: false, text: `New lesson in ${course(0).title}: "Server components"`, href: coursePage(0) },
      { row: 4, actionable: false, text: `We couldn't send your refund for ${course(2).title}; we're looking into it`, href: coursePage(2) },
    ];
    if (isTeamAdmin) {
      templates.unshift(
        { row: 5, actionable: false, text: `${person(1)} claimed a seat on ${course(0).title}`, href: "/team" },
        { row: 2, actionable: false, text: `Your refund request for ${course(2).title} was declined`, href: coursePage(2) }
      );
    }
  }

  const ages = [4, 35, 140, 60 * 26, 60 * 50, 60 * 120];
  const initial = templates.map((t, i) => ({
    ...t,
    id: `seed-${i}`,
    minutesAgo: ages[i] ?? 60 * 24 * (i + 1),
    read: i >= 2, // newest two unread
  }));
  return { initial, pool: templates };
}
