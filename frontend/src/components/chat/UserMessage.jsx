function UserMessage({ content }) {
  return (
    <div className="mb-6 flex justify-end">
      <div className="max-w-[75%] rounded-[1.4rem] rounded-tr-[0.4rem] bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_100%)] px-5 py-4 text-[0.97rem] leading-7 text-white shadow-[var(--shadow-sm)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export default UserMessage;
