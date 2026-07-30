import React from "react";
import "./Settings.css";

import SettingsSidebar from "./SettingsSidebar";
import AccountSettings from "./AccountSettings";

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="settings-container">

        <div className="settings-left">
          <SettingsSidebar />
        </div>

        <div className="settings-right">
          <AccountSettings />
        </div>

      </div>
    </div>
  );
};

export default Settings;