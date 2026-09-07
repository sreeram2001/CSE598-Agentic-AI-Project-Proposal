// Simple persistent user ID stored in localStorage
export function getUserId(): string {
    if (typeof window === "undefined") return "demo-user";
    let id = localStorage.getItem("sparkyfi_user_id");
    if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem("sparkyfi_user_id", id);
    }
    return id;
}
