import * as React from "react";

export default function Loader() {
  return (
    <div
      role="status"
      className="space-y-8 animate-pulse md:space-y-0 md:space-x-8 rtl:space-x-reverse md:flex md:items-center mt-10"
    >
      <div>
        <div className="flex items-center justify-center w-full h-48 bg-gray-400 rounded-sm sm:w-96 dark:bg-gray-400">
          <svg
            className="w-10 h-13 text-gray-200 dark:text-gray-200"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 18"
          >
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
          </svg>
        </div>
        <div className="h-2.5 w-64 bg-gray-200 rounded-full dark:bg-gray-400 my-4"></div>
        <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-400 max-w-[480px] mb-2.5"></div>
      </div>

      <div>
        <div className="flex items-center justify-center w-full h-48 bg-gray-400 rounded-sm sm:w-96 dark:bg-gray-400">
          <svg
            className="w-10 h-13 text-gray-200 dark:text-gray-200"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 18"
          >
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
          </svg>
        </div>
        <div className="h-2.5 w-64 bg-gray-200 rounded-full dark:bg-gray-400 my-4"></div>
        <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-400 max-w-[480px] mb-2.5"></div>
      </div>
      <div>
        <div className="flex items-center justify-center w-full h-48 bg-gray-400 rounded-sm sm:w-96 dark:bg-gray-400">
          <svg
            className="w-10 h-13 text-gray-200 dark:text-gray-200"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 18"
          >
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
          </svg>
        </div>
        <div className="h-2.5 w-64 bg-gray-200 rounded-full dark:bg-gray-400 my-4"></div>
        <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-400 max-w-[480px] mb-2.5"></div>
      </div>

      <span className="sr-only">Loading...</span>
    </div>
  );
}
