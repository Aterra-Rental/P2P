import {
    User,
    Shield,
    Lock,
    BadgeCheck,
    ChevronRight
} from "lucide-react";

const menuItems = [
    {
        title: "Account",
        description: "Manage your profile",
        icon: User,
        active: true,
    },
    {
        title: "Security",
        description: "Password & login",
        icon: Lock,
        active: false,
    },
    {
        title: "Privacy",
        description: "Visibility settings",
        icon: Shield,
        active: false,
    },
    {
        title: "Verification",
        description: "Identity verification",
        icon: BadgeCheck,
        active: false,
    },
];

const SettingsSidebar = () => {
    return (
        <aside className="settings-sidebar">

            <div className="settings-sidebar-header">
                <h2>Settings</h2>
                <p>Manage your account preferences</p>
            </div>

            <div className="settings-menu">

                {menuItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.title}
                            className={`settings-menu-item ${
                                item.active ? "active" : ""
                            }`}
                            disabled={!item.active}
                        >
                            <div className="menu-icon">
                                <Icon size={20} />
                            </div>

                            <div className="menu-content">
                                <h4>{item.title}</h4>
                                <span>{item.description}</span>
                            </div>

                            {item.active ? (
                                <ChevronRight size={18} />
                            ) : (
                                <span className="coming-soon">
                                    Soon
                                </span>
                            )}
                        </button>
                    );
                })}

            </div>

        </aside>
    );
};

export default SettingsSidebar;