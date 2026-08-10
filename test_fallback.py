from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool

@tool
def foo():
    """doc"""
    pass

llm = ChatGoogleGenerativeAI(model='gemini-3.5-flash').with_fallbacks([ChatGoogleGenerativeAI(model='gemini-1.5-flash')])
llm_bound = llm.bind_tools([foo])
print(type(llm_bound).__name__)
print(hasattr(llm_bound, 'fallbacks'))
