import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">{channel?.channelname}</h1>
            <div className="flex flex-wrap gap-4 text-sm theme-text-secondary">
              <span>@{channel?.channelname.toLowerCase().replace(/\s+/g, "")}</span>
            </div>
            {channel?.description && (
              <p className="text-sm theme-text-secondary max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          {user && user?._id !== channel?._id && (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={
                  isSubscribed
                    ? "rounded-full theme-bg-secondary theme-text-primary theme-hover"
                    : "theme-subscribe"
                }
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
