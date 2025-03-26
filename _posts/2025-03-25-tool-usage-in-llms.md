---
layout: post
title: "Tool Usage in Large Language Models (LLMs)"
date: 2025-03-25
---

# Cracking the Puzzle of Tool Usage in Large Language Models (LLMs)

After many attempts, I think I finally cracked the puzzle of how tools work with Large Language Models (LLMs)!
In this post, I’ll break down the motives and the reasoning behind LLM tool usage.

---

## Tools: What Are They?

Tools are **external resources** or **functions** that allow large language models (LLMs) to perform tasks **beyond basic text generation**. While LLMs excel at processing and generating text, they’re typically confined to the text domain and cannot natively perform calculations, retrieve real-time data, or execute code. Tools bridge this gap by **expanding an LLM’s capabilities**, making them more dynamic and capable of handling complex requests.

In general, tools enable:

- **Fetching Data**: Accessing external resources such as local files, databases, synthetic datasets, or web pages.  
- **Running Functions**: Executing programmatic tasks, from basic calculations to advanced computations.  
- **Taking Actions**: Interacting with hardware or other external systems (e.g., sending messages or controlling IoT devices).

### Why Tools Matter

Tools unlock a world of possibilities for LLMs:

- **External Data**: An API can fetch real-time information (like weather or stock prices).
- **Complex Math**: A calculator tool can handle precise math that might trip up an LLM (e.g., `12345 * 77777`).
- **Real-World Interactions**: Tools can handle tasks like booking a flight or retrieving documents from a database.

By integrating these functionalities, tools empower LLMs to move beyond their training data and deliver richer, more versatile solutions.

---

## Two Approaches: Prompt Engineering vs. Average User

### The Prompt Engineer’s Approach

If you’re a **prompt engineer**, you excel at crafting prompts tailored to produce highly relevant outputs. You might use **Retrieval-Augmented Generation (RAG)** techniques—where you pull in specific, relevant data and embed it directly into the prompt. For example:

> **Prompt**: “Using this data—weather: 65°F, sunny; location: New York—suggest an outfit for today.”

The LLM then processes the provided details and suggests something appropriate, such as “Wear a light jacket and sunglasses.”

This approach can yield excellent results, but it requires:
- **Expertise** in prompt engineering  
- **Time** to precisely structure the input  
- **Foresight** to predict the information the LLM needs for an effective answer

### The Average User’s Reality

Most users aren’t prompt engineers. They might simply ask:

> **Prompt**: “What should I wear today?”

Without tools, the LLM could:

- Guess based on outdated training data.  
- Ask for details, breaking the flow (“Where are you?” “What’s the weather?”).

With **tools**, however, the LLM can:

1. Recognize it needs weather data.  
2. Invoke a weather API, returning “65°F and sunny in New York.”  
3. Respond with, “Wear a light jacket and sunglasses.”

**The user didn’t have to provide any extra info**—the tool fetched it, and the LLM delivered a detailed, relevant answer.  

---

## More Complex Requests: Trip Planning

Tools shine even brighter for bigger tasks:

### Without Tools

> **Prompt (Engineer)**: “Using this data—flights: \$500 round-trip on Air France, Dec 1-7; hotels: \$150/night at Hotel X; attractions: Eiffel Tower, Louvre—plan a trip to Paris.”

You’ve done all the work upfront, gathering flight info, hotel rates, and attractions. The LLM just organizes what you already provided.

### With Tools

> **Prompt (User)**: “Plan a trip to Paris for me.”

The LLM can:

1. Use a flight-search tool (e.g., find \$500 round-trip flights).  
2. Check hotel availability (\$150/night at Hotel X).  
3. List local attractions (Eiffel Tower, Louvre).  
4. Create a full itinerary with no extra user input.

Tools don’t just **handle complex tasks**; they also enable the LLM to **demonstrate agency**—hence the term “agent.” Instead of relying on meticulously crafted prompts, the user simply asks a direct question, and the tool-empowered LLM takes care of the details.

---

## Why Tools Matter: Elevating the Experience

For a prompt engineer, tools might be optional—you can manually pack a prompt with all necessary info. But for the average user, **tools are a game-changer**. They:

- **Simplify Inputs**: No need to know RAG or data sourcing—just ask naturally.  
- **Enable Complexity**: Tools fetch and process data dynamically.  
- **Boost Accessibility**: Anyone can get sophisticated results without deep expertise.

Tools bridge the gap between what users say and what they need. They make LLMs **smarter** and **more intuitive**, ensuring high-quality results even from minimal prompts.

---

## How to Integrate Functions into an LLM Call

A common question is how to combine computer functions with text generation. Unlike a standard function call, **tool calling** involves the LLM’s output depending on the result of an external operation—meaning the LLM often needs to see the tool’s output before it can complete its response.

### Option 1: Placeholder Replacement (Single API Call)

This method is analogous to **dynamic content insertion** in web development. In frameworks like Handlebars or Vue.js, placeholders (e.g., `{{variable}}`) are replaced with computed values to update the UI. Here, the LLM’s placeholder (e.g., `[CALC:12345*77777]`) serves a similar purpose—acting as a marker for the client to replace with a computed result, enhancing the final output for the user.

1. **LLM Generates Placeholder**: For example, `[CALC:12345*77777]`.  
2. **Client Executes Calculation**: The client computes `960157065`.  
3. **Placeholder Replacement**: The placeholder in the LLM’s text is replaced with `960157065`.  

- **Pros**:  
  - Simple; no additional API calls are needed.  
  - Useful for displaying dynamic text to the end user in a straightforward way.  
- **Cons**:  
  - The LLM can’t adapt its explanation based on the tool’s result. If the LLM’s subsequent text depends on knowing the calculation at generation time, this approach isn’t sufficient.

### Option 2: Multiple API Calls (Standard Approach)

1. **Initial API Call**: “Calculate `12345*77777` and explain its significance.”  
2. **LLM Response**: “I need the result of `12345*77777` to proceed.”  
3. **Local Tool Execution**: Returns `960157065`.  
4. **Follow-up API Call**: “The result of `12345*77777` is `960157065`. Now explain its significance.”  
5. **Final LLM Response**: “Given that `12345*77777` is `960157065`, its significance is…”

- **Pros**:  
  - Flexible; the LLM can tailor its response after seeing the tool’s result.  
  - Supports complex reasoning and context-sensitive explanations.  
- **Cons**:  
  - Involves additional API calls and a more complex workflow.

Because the LLM may need to reference or reason about the tool’s output during the generation process, **multiple API calls** are generally more reliable for complex use cases. However, the placeholder approach can be excellent for simpler scenarios—particularly when you only need to insert computed values into the text to improve its clarity and usefulness for the end user in frontend applications.

---

## Calling tools: How It’s Done

In practice, tool calling follows a **conversational loop** between the client and the LLM:

1. **LLM Call nº 1: Send Prompt**: The client provides the initial query.  
2. **LLM Response**: The LLM either produces the final answer or indicates it needs one or more external tools.  
3. **Execute Tools**: The client runs the requested tools locally and returns both the prompt and tool results.  
4. **LLM Call nº 2: Integrate Results**: The LLM incorporates the tool outputs into its response.  

This loop can repeat if additional tools or data are required.

---

## Running the Tool Call: Code Example

Below is a simplified Python example (using the OpenAI API) showing how tool calling might work:

```python
try:
    # First API call: Send the prompt and available tools
    completion = self.client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        temperature=temperature,
        **kwargs,
    )
    # Append the LLM's response to the message history
    messages.append(completion.choices[0].message)
    
    # Check if the LLM requested any tool calls
    for tool_call in completion.choices[0].message.tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        
        # Execute the tool locally
        result = call_function(name, args)
        
        # Append the tool's result to the message history
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": str(result)
        })
    
    # Second API call: Send the updated message history with the tool's result
    completion_2 = self.client.chat.completions.create(
        model=model,
        messages=messages,
    )
    return completion_2.choices[0].message.content
```
---

## Conclusion

Tools unlock a world of possibilities for LLMs, enabling them to tackle tasks beyond text generation—such as complex mathematical operations, data retrieval, and external interactions. While integrating tools requires careful workflow design (and sometimes multiple API calls), the payoff is a **more capable and versatile** AI system.

Whether you’re a **prompt engineer** crafting precise prompts or an **everyday user** with simple questions, tools ensure the LLM has what it needs to deliver **rich, contextual answers** with minimal input. This approach improves results, boosts accessibility, and makes AI smarter and more helpful for everyone.
